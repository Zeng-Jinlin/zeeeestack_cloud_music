package com.zeeeestack.music.security

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Service
class SignatureService {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val secureRandom = SecureRandom()
    private var secretKey: ByteArray = generateSecretKey()

    private fun generateSecretKey(): ByteArray {
        val key = ByteArray(32)
        secureRandom.nextBytes(key)
        logger.info("Generated new secret key")
        return key
    }

    @Scheduled(fixedRate = 7 * 24 * 60 * 60 * 1000)
    fun rotateKey() {
        logger.info("Rotating secret key")
        secretKey = generateSecretKey()
    }

    fun generatePlayUrl(songId: String): String {
        val expires = Instant.now().plus(10, ChronoUnit.MINUTES).epochSecond
        val signature = sign("$songId:$expires")
        return "/api/play/$songId?expires=$expires&sign=$signature"
    }

    fun validatePlayUrl(songId: String, expires: Long, signature: String): Boolean {
        val now = Instant.now().epochSecond
        if (expires < now) {
            logger.warn("Play URL expired for song: $songId")
            return false
        }
        val expectedSignature = sign("$songId:$expires")
        return MessageDigest.isEqual(expectedSignature.toByteArray(), signature.toByteArray())
    }

    private fun sign(data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secretKey, "HmacSHA256"))
        val signatureBytes = mac.doFinal(data.toByteArray(Charsets.UTF_8))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes)
    }
}
