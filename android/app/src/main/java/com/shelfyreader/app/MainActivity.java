package com.shelfyreader.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(TorrentDownloaderPlugin.class);
        registerPlugin(LanguageIdentificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
