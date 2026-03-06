package com.shelfyreader.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.nl.languageid.LanguageIdentification;
import com.google.mlkit.nl.languageid.LanguageIdentifier;
import com.google.mlkit.nl.languageid.LanguageIdentificationOptions;

@CapacitorPlugin(name = "LanguageIdentification")
public class LanguageIdentificationPlugin extends Plugin {

    @PluginMethod()
    public void identify(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Text is required");
            return;
        }

        float minConfidence = call.getFloat("minConfidence", 0.5f);

        LanguageIdentificationOptions options = new LanguageIdentificationOptions.Builder()
                .setConfidenceThreshold(minConfidence)
                .build();

        LanguageIdentifier identifier = LanguageIdentification.getClient(options);

        identifier.identifyLanguage(text)
                .addOnSuccessListener(languageCode -> {
                    JSObject result = new JSObject();
                    if (languageCode.equals("und")) {
                        result.put("language", "und");
                        result.put("confident", false);
                    } else {
                        result.put("language", languageCode);
                        result.put("confident", true);
                    }
                    call.resolve(result);
                    identifier.close();
                })
                .addOnFailureListener(e -> {
                    call.reject("Language identification failed: " + e.getMessage());
                    identifier.close();
                });
    }
}
