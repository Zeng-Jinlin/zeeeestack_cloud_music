package com.zeeeestack.music.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration
import java.nio.file.Path
import java.nio.file.Paths

@Configuration
@ConfigurationProperties(prefix = "app.music")
class AppConfig {
    lateinit var musicDirectory: String
    lateinit var coverDirectory: String

    fun getMusicPath(): Path {
        return Paths.get(musicDirectory).toAbsolutePath().normalize()
    }

    fun getCoverPath(): Path {
        return Paths.get(coverDirectory).toAbsolutePath().normalize()
    }
}
