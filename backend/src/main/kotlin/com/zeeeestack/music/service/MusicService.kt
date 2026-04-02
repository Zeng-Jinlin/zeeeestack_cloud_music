package com.zeeeestack.music.service

import com.zeeeestack.music.model.Song
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.security.MessageDigest

@Service
class MusicService(
    @Value("\${app.music.music-directory}")
    private val musicDirectory: String,
    @Value("\${app.music.cover-directory}")
    private val coverDirectory: String
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val supportedExtensions = setOf("mp3", "wav", "flac", "ogg", "m4a", "aac")
    private val coverExtensions = setOf("jpg", "jpeg", "png", "webp")
    private val songCache = mutableMapOf<String, Path>()

    init {
        refreshSongs()
    }

    fun getSongs(): List<Song> {
        refreshSongs()
        return songCache.entries.map { (id, path) ->
            Song(
                songId = id,
                name = path.fileName.toString().removeSuffix(".${path.fileName.toString().substringAfterLast('.')}")
            )
        }.sortedBy { it.name }
    }

    fun getSongPath(songId: String): Path? {
        return songCache[songId]
    }

    fun refreshSongs() {
        val basePath = Paths.get(musicDirectory).toAbsolutePath().normalize()
        if (!Files.exists(basePath)) {
            logger.warn("Music directory does not exist: $basePath")
            Files.createDirectories(basePath)
            return
        }

        val newCache = mutableMapOf<String, Path>()
        Files.walk(basePath)
            .filter { Files.isRegularFile(it) }
            .filter { it.fileName.toString().substringAfterLast('.').lowercase() in supportedExtensions }
            .forEach { path ->
                val songId = generateSongId(path)
                newCache[songId] = path
            }

        songCache.clear()
        songCache.putAll(newCache)
        logger.info("Loaded ${songCache.size} songs from $basePath")
    }

    private fun generateSongId(path: Path): String {
        val relativePath = Paths.get(musicDirectory).toAbsolutePath().normalize().relativize(path)
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(relativePath.toString().toByteArray())
        return hash.joinToString("") { "%02x".format(it) }.substring(0, 16)
    }

    fun getCoverPath(songId: String): Path? {
        val songPath = songCache[songId] ?: return null
        val songFileName = songPath.fileName.toString()
        val baseName = songFileName.substring(0, songFileName.lastIndexOf('.'))
        val coverDirPath = Paths.get(coverDirectory).toAbsolutePath().normalize()
        
        for (ext in coverExtensions) {
            val coverPath = coverDirPath.resolve("$baseName.$ext")
            if (Files.exists(coverPath)) {
                return coverPath
            }
        }
        return null
    }
}
