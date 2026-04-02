package com.antifraud.assistant;

import android.Manifest;
import android.database.Cursor;
import android.provider.Telephony;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsBridge",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS })
    }
)
public class SmsBridgePlugin extends Plugin {
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias("sms", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void readInbox(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "readInboxPermissionCallback");
            return;
        }

        readInboxWithPermission(call);
    }

    @PermissionCallback
    private void readInboxPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission denied");
            return;
        }

        readInboxWithPermission(call);
    }

    private void readInboxWithPermission(PluginCall call) {
        int limit = call.getInt("limit", 50);
        if (limit <= 0) {
            limit = 50;
        }
        limit = Math.min(limit, 200);

        JSArray messages = new JSArray();
        Cursor cursor = null;

        try {
            String[] projection = new String[] {
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE,
                Telephony.Sms.READ,
                Telephony.Sms.TYPE,
                Telephony.Sms.THREAD_ID
            };

            cursor = getContext().getContentResolver().query(
                Telephony.Sms.Inbox.CONTENT_URI,
                projection,
                null,
                null,
                Telephony.Sms.DATE + " DESC"
            );

            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    JSObject item = new JSObject();
                    item.put("id", cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms._ID)));
                    item.put("address", cursor.getString(cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)));
                    item.put("body", cursor.getString(cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)));
                    item.put("date", cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)));
                    item.put("read", cursor.getInt(cursor.getColumnIndexOrThrow(Telephony.Sms.READ)) == 1);
                    item.put("type", cursor.getInt(cursor.getColumnIndexOrThrow(Telephony.Sms.TYPE)));
                    item.put("threadId", cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)));
                    messages.put(item);
                    count++;
                }
            }

            JSObject ret = new JSObject();
            ret.put("messages", messages);
            ret.put("count", messages.length());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("读取短信失败: " + e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }
}