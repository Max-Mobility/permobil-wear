package com.permobil.wearos.helper

import android.os.Bundle
import android.os.Handler
import android.support.wearable.activity.WearableActivity
import android.widget.ImageView
import android.widget.TextView

class ConfirmationActivity : WearableActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_confirmation)

        // Enables Always-on
        setAmbientEnabled()

        val text: String = this.intent.getStringExtra("Message")
        val dismissTime: Int = this.intent.getIntExtra("DismissTimeout", 3)
        val textView: TextView = findViewById(R.id.confirmation_message)
        val imageView: ImageView = findViewById(R.id.confirmationImage)
        val confirmationType = this.intent.getIntExtra("Type", 0)

// set the default success message if nothing is passed with the intent
        if (text.isEmpty()) {
            textView.text = "Ooops! An error has occurred."
        } else {
            textView.text = text
        }

        if (confirmationType == 0) {
            imageView.setImageResource(R.drawable.round_check_white_48)
        } else {
            imageView.setImageResource(R.drawable.ic_full_sad)
        }


        val convertedDismissTime: Long = (dismissTime * 1000).toLong()

        // run the handler after the dismissal time
        Handler().postDelayed(
            {
                this.finish()
            }, convertedDismissTime
        )

    }
}
