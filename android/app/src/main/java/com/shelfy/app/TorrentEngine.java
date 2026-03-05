package com.shelfy.app;

import android.content.Context;
import android.util.Log;

import org.libtorrent4j.AlertListener;
import org.libtorrent4j.Priority;
import org.libtorrent4j.SessionManager;
import org.libtorrent4j.SessionParams;
import org.libtorrent4j.SettingsPack;
import org.libtorrent4j.TorrentFlags;
import org.libtorrent4j.TorrentHandle;
import org.libtorrent4j.TorrentInfo;
import org.libtorrent4j.TorrentStatus;
import org.libtorrent4j.alerts.AddTorrentAlert;
import org.libtorrent4j.alerts.Alert;
import org.libtorrent4j.alerts.AlertType;
import org.libtorrent4j.alerts.PieceFinishedAlert;
import org.libtorrent4j.alerts.TorrentErrorAlert;
import org.libtorrent4j.alerts.TorrentFinishedAlert;
import org.libtorrent4j.swig.settings_pack;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class TorrentEngine {
    private static final String TAG = "TorrentEngine";
    private static final long METADATA_TIMEOUT_MS = 120_000; // 2 minutes
    private static final long DOWNLOAD_TIMEOUT_MS = 300_000; // 5 minutes

    private static final Set<String> EBOOK_EXTENSIONS = new HashSet<>(Arrays.asList(
            "epub", "pdf", "mobi", "azw3", "fb2", "cbz", "cbr", "djvu", "txt", "docx", "odt", "rtf"
    ));

    private static final Set<String> ARCHIVE_EXTENSIONS = new HashSet<>(Arrays.asList(
            "zip", "rar"
    ));

    private static TorrentEngine instance;
    private SessionManager sessionManager;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private Context context;
    private final AtomicBoolean cancelled = new AtomicBoolean(false);
    private TorrentHandle currentHandle;

    public interface DownloadCallback {
        void onProgress(double progress, long downloadSpeed, int numPeers, long downloaded, long totalSize);
        void onComplete(byte[] fileData, String fileName);
        void onError(String error);
    }

    private TorrentEngine() {}

    public static synchronized TorrentEngine getInstance() {
        if (instance == null) {
            instance = new TorrentEngine();
        }
        return instance;
    }

    public synchronized void init(Context ctx) {
        if (sessionManager != null && sessionManager.isRunning()) {
            return;
        }
        this.context = ctx.getApplicationContext();

        SettingsPack sp = new SettingsPack();
        sp.setBoolean(settings_pack.bool_types.enable_dht.swigValue(), true);
        sp.setBoolean(settings_pack.bool_types.enable_lsd.swigValue(), true);
        sp.setString(settings_pack.string_types.dht_bootstrap_nodes.swigValue(),
                "router.bittorrent.com:6881,router.utorrent.com:6881,dht.transmissionbt.com:6881,dht.aelitis.com:6881");
        sp.setInteger(settings_pack.int_types.active_downloads.swigValue(), 1);
        sp.setInteger(settings_pack.int_types.connections_limit.swigValue(), 200);

        SessionParams params = new SessionParams(sp);
        sessionManager = new SessionManager();
        sessionManager.start(params);

        Log.i(TAG, "TorrentEngine initialized");
    }

    public void download(String magnetURI, DownloadCallback callback) {
        cancelled.set(false);
        executor.submit(() -> {
            try {
                doDownload(magnetURI, callback);
            } catch (Exception e) {
                Log.e(TAG, "Download failed", e);
                callback.onError(e.getMessage() != null ? e.getMessage() : "Unknown error");
            }
        });
    }

    private void doDownload(String magnetURI, DownloadCallback callback) {
        if (sessionManager == null || !sessionManager.isRunning()) {
            callback.onError("TorrentEngine not initialized");
            return;
        }

        File downloadDir = new File(context.getCacheDir(), "torrent_downloads");
        if (!downloadDir.exists()) {
            downloadDir.mkdirs();
        }

        CountDownLatch doneLatch = new CountDownLatch(1);
        AtomicBoolean hasError = new AtomicBoolean(false);

        int[] alertTypes = new int[]{
                AlertType.ADD_TORRENT.swig(),
                AlertType.PIECE_FINISHED.swig(),
                AlertType.TORRENT_FINISHED.swig(),
                AlertType.TORRENT_ERROR.swig(),
        };

        AlertListener listener = new AlertListener() {
            @Override
            public int[] types() {
                return alertTypes;
            }

            @Override
            public void alert(Alert<?> alert) {
                if (cancelled.get()) return;

                switch (alert.type()) {
                    case ADD_TORRENT: {
                        AddTorrentAlert a = (AddTorrentAlert) alert;
                        if (a.error().isError()) {
                            hasError.set(true);
                            callback.onError("Failed to add torrent: " + a.error().toString());
                            doneLatch.countDown();
                        } else {
                            currentHandle = a.handle();
                            currentHandle.setFlags(TorrentFlags.SEQUENTIAL_DOWNLOAD);
                            prioritizeDownloadableFiles(currentHandle);
                        }
                        break;
                    }
                    case PIECE_FINISHED: {
                        PieceFinishedAlert a = (PieceFinishedAlert) alert;
                        TorrentHandle h = a.handle();
                        TorrentStatus status = h.status();
                        callback.onProgress(
                                status.progress(),
                                status.downloadPayloadRate(),
                                status.numPeers(),
                                status.totalDone(),
                                status.totalWanted()
                        );
                        break;
                    }
                    case TORRENT_FINISHED: {
                        callback.onProgress(1.0, 0, 0, 0, 0);
                        doneLatch.countDown();
                        break;
                    }
                    case TORRENT_ERROR: {
                        TorrentErrorAlert a = (TorrentErrorAlert) alert;
                        hasError.set(true);
                        callback.onError("Torrent error: " + a.error().toString());
                        doneLatch.countDown();
                        break;
                    }
                }
            }
        };

        sessionManager.addListener(listener);

        try {
            // Fetch metadata from magnet URI (blocking call)
            byte[] torrentData = sessionManager.fetchMagnet(magnetURI, (int)(METADATA_TIMEOUT_MS / 1000), downloadDir);
            if (torrentData == null) {
                if (!cancelled.get() && !hasError.get()) {
                    callback.onError("Timed out waiting for torrent metadata");
                }
                return;
            }

            if (cancelled.get() || hasError.get()) return;

            TorrentInfo torrentInfo = TorrentInfo.bdecode(torrentData);
            sessionManager.download(torrentInfo, downloadDir);

            // Wait for download
            if (!doneLatch.await(DOWNLOAD_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
                if (!cancelled.get() && !hasError.get()) {
                    callback.onError("Download timed out");
                }
                return;
            }

            if (cancelled.get() || hasError.get()) return;

            // Find the best downloadable file (ebook first, then archive)
            File bestFile = findDownloadableFile(downloadDir);
            if (bestFile == null) {
                callback.onError("No ebook or archive file found in download");
                return;
            }

            byte[] fileData = readFile(bestFile);
            callback.onComplete(fileData, bestFile.getName());

        } catch (IOException e) {
            Log.e(TAG, "Failed to read downloaded file", e);
            callback.onError("Failed to read downloaded file: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            callback.onError("Download interrupted");
        } finally {
            sessionManager.removeListener(listener);
            cleanup(downloadDir);
        }
    }

    private void prioritizeDownloadableFiles(TorrentHandle handle) {
        TorrentInfo info = handle.torrentFile();
        if (info == null) return;

        int numFiles = info.numFiles();
        boolean hasDownloadable = false;

        // First pass: check if there are any ebook or archive files
        for (int i = 0; i < numFiles; i++) {
            String fileName = info.files().fileName(i);
            String ext = getFileExtension(fileName).toLowerCase();
            if (EBOOK_EXTENSIONS.contains(ext) || ARCHIVE_EXTENSIONS.contains(ext)) {
                hasDownloadable = true;
                break;
            }
        }

        // If no ebook/archive files, download everything (let the TS side handle it)
        if (!hasDownloadable) return;

        // Second pass: prioritize ebook/archive files, ignore the rest
        for (int i = 0; i < numFiles; i++) {
            String fileName = info.files().fileName(i);
            String ext = getFileExtension(fileName).toLowerCase();
            if (EBOOK_EXTENSIONS.contains(ext) || ARCHIVE_EXTENSIONS.contains(ext)) {
                handle.filePriority(i, Priority.DEFAULT);
            } else {
                handle.filePriority(i, Priority.IGNORE);
            }
        }
    }

    private File findDownloadableFile(File dir) {
        // First try to find an ebook file
        File ebookFile = findFileByExtensions(dir, EBOOK_EXTENSIONS);
        if (ebookFile != null) return ebookFile;

        // Then try archive files
        File archiveFile = findFileByExtensions(dir, ARCHIVE_EXTENSIONS);
        if (archiveFile != null) return archiveFile;

        // Fallback: return the largest file
        return findLargestFile(dir);
    }

    private File findFileByExtensions(File dir, Set<String> extensions) {
        File best = null;
        long bestSize = 0;
        File[] files = dir.listFiles();
        if (files == null) return null;

        for (File f : files) {
            if (f.isDirectory()) {
                File nested = findFileByExtensions(f, extensions);
                if (nested != null && nested.length() > bestSize) {
                    best = nested;
                    bestSize = nested.length();
                }
            } else {
                String ext = getFileExtension(f.getName()).toLowerCase();
                if (extensions.contains(ext) && f.length() > bestSize) {
                    best = f;
                    bestSize = f.length();
                }
            }
        }
        return best;
    }

    private File findLargestFile(File dir) {
        File best = null;
        long bestSize = 0;
        File[] files = dir.listFiles();
        if (files == null) return null;

        for (File f : files) {
            if (f.isDirectory()) {
                File nested = findLargestFile(f);
                if (nested != null && nested.length() > bestSize) {
                    best = nested;
                    bestSize = nested.length();
                }
            } else if (f.length() > bestSize) {
                best = f;
                bestSize = f.length();
            }
        }
        return best;
    }

    private String getFileExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot >= 0 ? fileName.substring(dot + 1) : "";
    }

    private byte[] readFile(File file) throws IOException {
        byte[] data = new byte[(int) file.length()];
        try (FileInputStream fis = new FileInputStream(file)) {
            int offset = 0;
            while (offset < data.length) {
                int read = fis.read(data, offset, data.length - offset);
                if (read < 0) break;
                offset += read;
            }
        }
        return data;
    }

    private void cleanup(File dir) {
        if (currentHandle != null) {
            try {
                sessionManager.remove(currentHandle);
            } catch (Exception e) {
                Log.w(TAG, "Failed to remove torrent handle", e);
            }
            currentHandle = null;
        }
        deleteRecursive(dir);
    }

    private void deleteRecursive(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        file.delete();
    }

    public void cancel() {
        cancelled.set(true);
        if (currentHandle != null && sessionManager != null) {
            try {
                sessionManager.remove(currentHandle);
            } catch (Exception e) {
                Log.w(TAG, "Failed to cancel torrent", e);
            }
            currentHandle = null;
        }
    }

    public synchronized void stop() {
        if (sessionManager != null && sessionManager.isRunning()) {
            sessionManager.stop();
            sessionManager = null;
        }
        cancelled.set(true);
        Log.i(TAG, "TorrentEngine stopped");
    }
}
