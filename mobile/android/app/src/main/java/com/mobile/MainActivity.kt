package com.mobile

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // installSplashScreen() must be called before super.onCreate().
    // It hooks up the AndroidX SplashScreen API and keeps the native
    // splash on screen until the React root view is ready to render.
    // The RN <SplashScreen/> component then takes over with its own
    // animated reveal — giving a seamless native → JS handoff.
    val splash = installSplashScreen()

    // We don't manually gate dismissal — the system dismisses the native
    // splash as soon as the first React frame is drawn. The RN-side
    // splash overlay continues the brand experience without flicker.
    splash.setKeepOnScreenCondition { false }

    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "mobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
