package com.zeeeestack.music.util

import org.bytedeco.javacv.FFmpegFrameGrabber
import org.slf4j.LoggerFactory
import java.nio.file.Path

object AudioMetadataUtils {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun getDurationInSeconds(audioPath: Path): Long {
        return try {
            logger.info("Parsing audio file: ${audioPath.fileName}, full path: $audioPath")
            FFmpegFrameGrabber.createDefault(audioPath.toFile()).use { grabber ->
                grabber.start()
                val durationSeconds = grabber.lengthInTime / 1000000L
                logger.info("Successfully parsed: ${audioPath.fileName} = $durationSeconds seconds")
                durationSeconds
            }
        } catch (e: Exception) {
            logger.error("Failed to parse audio file: ${audioPath.fileName}, error: ${e.message}", e)
            0L
        }
    }

    fun getDurationInMilliseconds(audioPath: Path): Long {
        return try {
            logger.info("Parsing audio file: ${audioPath.fileName}, full path: $audioPath")
            FFmpegFrameGrabber.createDefault(audioPath.toFile()).use { grabber ->
                grabber.start()
                val durationMs = grabber.lengthInTime / 1000L
                logger.info("Successfully parsed: ${audioPath.fileName} = $durationMs ms")
                durationMs
            }
        } catch (e: Exception) {
            logger.error("Failed to parse audio file: ${audioPath.fileName}, error: ${e.message}", e)
            0L
        }
    }
}
