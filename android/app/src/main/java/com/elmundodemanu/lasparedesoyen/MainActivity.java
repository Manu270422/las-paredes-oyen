package com.elmundodemanu.lasparedesoyen;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * La ventana del juego en Android: pantalla completa (sin barras del sistema) y sin apagarse sola.
 * Una medición son 6 segundos sin tocar nada: si la pantalla se durmiera, el miedo se cortaría ahí.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        ocultarBarras();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Al volver de otra app (o de bajar la cortina de notificaciones), las barras reaparecen: las escondo otra vez.
        if (hasFocus) ocultarBarras();
    }

    /** Modo inmersivo: las barras solo aparecen un momento si el jugador desliza desde el borde. */
    private void ocultarBarras() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat control = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        control.hide(WindowInsetsCompat.Type.systemBars());
        control.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
