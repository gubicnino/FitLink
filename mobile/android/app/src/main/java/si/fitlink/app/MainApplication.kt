package si.fitlink.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.lugg.RNCConfig.RNCConfigPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(RNCConfigPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    registerNotificationChannels()
  }

  // Channel id must match what the backend sends in AndroidNotification.channelId
  // (see FcmPushService). IMPORTANCE_HIGH is what makes Android show the heads-up
  // banner over the lockscreen / current app; without it, pushes only land
  // silently in the notification shade.
  private fun registerNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    val channel = NotificationChannel(
      "fitlink_default",
      "FitLink notifications",
      NotificationManager.IMPORTANCE_HIGH
    )
    channel.description = "Chat messages, video call requests, and other timely updates."
    channel.enableVibration(true)
    manager.createNotificationChannel(channel)
  }
}
