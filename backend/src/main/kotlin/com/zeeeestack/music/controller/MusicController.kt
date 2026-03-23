package com.zeeeestack.music.controller

import com.zeeeestack.music.model.ErrorResponse
import com.zeeeestack.music.model.PlaybackUrlResponse
import com.zeeeestack.music.model.Song
import com.zeeeestack.music.security.SignatureService
import com.zeeeestack.music.service.MusicService
import org.slf4j.LoggerFactory
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.nio.file.Files
import java.nio.file.Path

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = ["*"])
class MusicController(
    private val musicService: MusicService,
    private val signatureService: SignatureService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @GetMapping("/songs")
    fun getSongs(): ResponseEntity<List<Song>> {
        return ResponseEntity.ok(musicService.getSongs())
    }

    @GetMapping("/songs/{songId}/play-url")
    fun getPlayUrl(@PathVariable songId: String): ResponseEntity<*> {
        val songPath = musicService.getSongPath(songId)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse("NOT_FOUND", "Song not found"))

        val expiresAt = signatureService.generateExpirationTimestamp()
        val signature = signatureService.generateSignature(songId, expiresAt)

        val url = "/api/play/$songId?expires=$expiresAt&sign=$signature"
        return ResponseEntity.ok(PlaybackUrlResponse(url))
    }

    @GetMapping("/play/{songId}")
    fun playSong(
        @PathVariable songId: String,
        @RequestParam expires: Long,
        @RequestParam sign: String
    ): ResponseEntity<*> {
        if (signatureService.isExpired(expires)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse("EXPIRED", "Playback URL has expired"))
        }

        if (!signatureService.verifySignature(songId, expires, sign)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse("INVALID_SIGNATURE", "Invalid signature"))
        }

        val songPath = musicService.getSongPath(songId)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse("NOT_FOUND", "Song not found"))

        return serveFile(songPath)
    }

    private fun serveFile(path: Path): ResponseEntity<Resource> {
        val resource = FileSystemResource(path)
        val contentTypeStr = Files.probeContentType(path) ?: "application/octet-stream"

        val headers = HttpHeaders().apply {
            contentType = MediaType.parseMediaType(contentTypeStr)
            contentLength = resource.contentLength()
            setContentDispositionFormData("inline", path.fileName.toString())
        }

        return ResponseEntity.ok()
            .headers(headers)
            .body(resource)
    }

    @GetMapping("/songs/{songId}/cover")
    fun getCover(@PathVariable songId: String): ResponseEntity<*> {
        val coverPath = musicService.getCoverPath(songId)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse("NOT_FOUND", "Cover not found"))

        return serveFile(coverPath)
    }
}
