package com.zeeeestack.music.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.zeeeestack.music.config.AppConfig
import com.zeeeestack.music.model.Song
import com.zeeeestack.music.util.AudioMetadataUtils
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.stream.Collectors

@Service
class MusicService(
    private val appConfig: AppConfig
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val supportedAudioExtensions = setOf("mp3", "wav", "flac", "ogg", "m4a", "aac")
    private val supportedCoverExtensions = setOf("jpg", "jpeg", "png", "webp")
    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    private var songs: List<Song> = emptyList()
    private val staticInfoPath: Path = Paths.get(System.getProperty("user.dir")).parent.resolve("music/music-info/static-info.json").normalize()

    @PostConstruct
    fun init() {
        refreshSongs()
    }

    fun refreshSongs() {
        logger.info("Refreshing song list")
        val musicPath = appConfig.getMusicPath()
        val coverPath = appConfig.getCoverPath()

        if (!Files.exists(musicPath)) {
            logger.warn("Music directory does not exist: $musicPath")
            songs = emptyList()
            return
        }

        val songList = mutableListOf<Song>()

        Files.list(musicPath).use { stream ->
            stream
                .filter { Files.isRegularFile(it) }
                .filter { supportedAudioExtensions.contains(it.fileName.toString().substringAfterLast('.').lowercase()) }
                .forEach { file ->
                    try {
                        val songId = file.fileName.toString().substringBeforeLast('.')
                        val duration = AudioMetadataUtils.getDurationInSeconds(file)
                        val hasCover = hasCover(songId, coverPath)
                        val lastModified = Files.getLastModifiedTime(file).toMillis()

                        logger.info("Parsed song: $songId, duration: $duration seconds, lastModified: $lastModified")
                        songList.add(Song(songId, songId, "", null, duration, hasCover, lastModified))
                    } catch (e: Exception) {
                        logger.error("Failed to process audio file: ${file.fileName}", e)
                    }
                }
        }

        songs = songList
        logger.info("Loaded ${songs.size} songs")

        syncToStaticInfo(songList, musicPath)
    }

    private fun syncToStaticInfo(songList: List<Song>, musicPath: Path) {
        try {
            val staticInfoPathDir = staticInfoPath.parent
            if (!Files.exists(staticInfoPathDir)) {
                Files.createDirectories(staticInfoPathDir)
            }

            val songsInfo = songList.map { song ->
                logger.info("Syncing song info: ${song.songId}, duration=${song.duration}s, lastModified=${song.lastModified}")
                mapOf(
                    "songId" to song.songId,
                    "songName" to song.songId,
                    "duration" to song.duration,
                    "lastModified" to song.lastModified
                )
            }

            val staticInfo = mapOf("songs" to songsInfo)
            val jsonContent = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(staticInfo)
            Files.writeString(staticInfoPath, jsonContent)
            logger.info("Successfully synced ${songList.size} songs to static-info.json")
        } catch (e: Exception) {
            logger.error("Failed to sync to static-info.json: ${e.message}", e)
        }
    }

    private fun findAudioFile(musicPath: Path, songId: String): Path? {
        return supportedAudioExtensions
            .map { musicPath.resolve("$songId.$it") }
            .firstOrNull { Files.exists(it) }
    }

    private fun hasCover(songId: String, coverPath: Path): Boolean {
        if (!Files.exists(coverPath)) return false
        return supportedCoverExtensions.any { ext ->
            Files.exists(coverPath.resolve("$songId.$ext"))
        }
    }

    fun getAllSongs(): List<Song> = songs

    fun getSong(songId: String): Song? = songs.find { it.songId == songId }

    fun getMusicFile(songId: String): Path? {
        val musicPath = appConfig.getMusicPath()
        return supportedAudioExtensions
            .map { musicPath.resolve("$songId.$it") }
            .firstOrNull { Files.exists(it) }
    }

    fun getCoverFile(songId: String): Path? {
        val coverPath = appConfig.getCoverPath()
        return supportedCoverExtensions
            .map { coverPath.resolve("$songId.$it") }
            .firstOrNull { Files.exists(it) }
    }

    fun getStaticInfo(): Map<String, Any> {
        return try {
            if (Files.exists(staticInfoPath)) {
                val content = Files.readString(staticInfoPath)
                @Suppress("UNCHECKED_CAST")
                objectMapper.readValue(content, Map::class.java) as Map<String, Any>
            } else {
                logger.warn("static-info.json does not exist")
                mapOf("songs" to emptyList<Map<String, Any>>())
            }
        } catch (e: Exception) {
            logger.error("Failed to read static-info.json: ${e.message}", e)
            mapOf("songs" to emptyList<Map<String, Any>>())
        }
    }
}
