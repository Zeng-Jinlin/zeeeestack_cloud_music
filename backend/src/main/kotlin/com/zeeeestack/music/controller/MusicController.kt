package com.zeeeestack.music.controller

import com.zeeeestack.music.model.Song
import com.zeeeestack.music.ratelimiter.RateLimiterService
import com.zeeeestack.music.security.SignatureService
import com.zeeeestack.music.service.MusicService
import org.slf4j.LoggerFactory
import org.springframework.core.io.FileSystemResource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import jakarta.servlet.http.HttpServletRequest
import java.nio.file.Files

@RestController
@RequestMapping("/api")
class MusicController(
    private val musicService: MusicService,
    private val signatureService: SignatureService,
    private val rateLimiterService: RateLimiterService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @GetMapping("/songs")
    fun getSongs(): List<Song> {
        logger.info("GET /api/songs")
        return musicService.getAllSongs()
    }

    @GetMapping("/static-info")
    fun getStaticInfo(): ResponseEntity<Map<String, Any>> {
        logger.info("GET /api/static-info")
        return ResponseEntity.ok(musicService.getStaticInfo())
    }

    @GetMapping("/songs/{songId}")
    fun getSong(@PathVariable songId: String): ResponseEntity<Song> {
        logger.info("GET /api/songs/$songId")
        val song = musicService.getSong(songId)
        return if (song != null) {
            ResponseEntity.ok(song)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/songs/{songId}/play-url")
    fun getPlayUrl(
        @PathVariable songId: String,
        @RequestHeader(value = "X-Forwarded-For", required = false) xForwardedFor: String?,
        @RequestHeader(value = "X-Real-IP", required = false) xRealIp: String?,
        @CookieValue(value = "device_fingerprint", required = false) deviceFingerprint: String?,
        request: HttpServletRequest
    ): ResponseEntity<Map<String, String>> {
        logger.info("GET /api/songs/$songId/play-url")

        val clientIp = getClientIp(xForwardedFor, xRealIp, request)

        if (!rateLimiterService.checkRequest(clientIp, deviceFingerprint, songId)) {
            logger.warn("限流拒绝：IP=$clientIp, Cookie 指纹=$deviceFingerprint, songId=$songId")
            return ResponseEntity.status(403).body(mapOf("error" to "请求过于频繁，请稍后再试"))
        }

        val song = musicService.getSong(songId)
        if (song == null) {
            return ResponseEntity.notFound().build()
        }
        val playUrl = signatureService.generatePlayUrl(songId)
        return ResponseEntity.ok(mapOf("playUrl" to playUrl))
    }

    private fun getClientIp(
        xForwardedFor: String?,
        xRealIp: String?,
        request: HttpServletRequest
    ): String {
        xForwardedFor?.let {
            val ip = it.split(",").firstOrNull()?.trim()
            if (!ip.isNullOrEmpty() && ip != "unknown") {
                return ip
            }
        }
        xRealIp?.let {
            val ip = it.trim()
            if (ip.isNotEmpty() && ip != "unknown") {
                return ip
            }
        }
        return request.remoteAddr ?: "unknown"
    }

    @GetMapping("/songs/{songId}/cover")
    fun getCover(@PathVariable songId: String): ResponseEntity<Any> {
        logger.info("GET /api/songs/$songId/cover")
        val coverFile = musicService.getCoverFile(songId)
        if (coverFile == null) {
            return ResponseEntity.notFound().build()
        }
        val resource = FileSystemResource(coverFile)
        val contentType = Files.probeContentType(coverFile) ?: "application/octet-stream"
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .body(resource)
    }

    @GetMapping("/play/{songId}")
    fun playMusic(
        @PathVariable songId: String,
        @RequestParam expires: Long,
        @RequestParam sign: String
    ): ResponseEntity<Any> {
        logger.info("GET /api/play/$songId?expires=$expires&sign=***")

        if (!signatureService.validatePlayUrl(songId, expires, sign)) {
            logger.warn("Invalid signature for song: $songId")
            return ResponseEntity.badRequest().build()
        }

        val musicFile = musicService.getMusicFile(songId)
        if (musicFile == null) {
            logger.warn("Music file not found for song: $songId")
            return ResponseEntity.notFound().build()
        }

        val resource = FileSystemResource(musicFile)
        val contentType = Files.probeContentType(musicFile) ?: "audio/mpeg"
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header("Content-Disposition", "inline; filename=\"${musicFile.fileName}\"")
            .body(resource)
    }
}
