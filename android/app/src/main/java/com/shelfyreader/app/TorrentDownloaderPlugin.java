package com.shelfyreader.app;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TorrentDownloader")
public class TorrentDownloaderPlugin extends Plugin {
    private static final String TAG = "TorrentDownloader";
    private TorrentEngine engine;

    @Override
    public void load() {
        engine = TorrentEngine.getInstance();
        engine.init(getContext());
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void download(PluginCall call) {
        String magnetURI = call.getString("magnetURI");
        if (magnetURI == null || magnetURI.isEmpty()) {
            call.reject("magnetURI is required");
            return;
        }

        call.setKeepAlive(true);

        engine.download(magnetURI, new TorrentEngine.DownloadCallback() {
            @Override
            public void onProgress(double progress, long downloadSpeed, int numPeers, long downloaded, long totalSize) {
                JSObject data = new JSObject();
                data.put("progress", progress);
                data.put("downloadSpeed", downloadSpeed);
                data.put("numPeers", numPeers);
                data.put("downloaded", downloaded);
                data.put("totalSize", totalSize);
                data.put("timeRemaining", totalSize > 0 && downloadSpeed > 0
                        ? (long) ((totalSize - downloaded) / (double) downloadSpeed * 1000)
                        : 0);
                notifyListeners("downloadProgress", data);
            }

            @Override
            public void onComplete(byte[] fileData, String fileName) {
                JSObject result = new JSObject();
                result.put("fileData", Base64.encodeToString(fileData, Base64.NO_WRAP));
                result.put("fileName", fileName);
                call.resolve(result);
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Download error: " + error);
                call.reject(error);
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        engine.cancel();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (engine != null) {
            engine.stop();
        }
        super.handleOnDestroy();
    }
}
