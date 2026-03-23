package com.zeeeestack.music.security

import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.crypto.Mac

@Service
class SignatureService(
    private val securityKeyManager: SecurityKeyManager
) {
    companion object {
        const val TEMP_URL_VALID_MINUTES = 10L
    }

    fun generateSignature(songId: String, expiresAt: Long): String {
        val data = "$songId$expiresAt"
        return hmacSha256(data)
    }

    fun verifySignature(songId: String, expiresAt: Long, signature: String): Boolean {
        val expectedSignature = generateSignature(songId, expiresAt)
        return expectedSignature.equals(signature, ignoreCase = false)
    }

    fun isExpired(expiresAt: Long): Boolean {
        return Instant.now().isAfter(Instant.ofEpochSecond(expiresAt))
    }

    fun generateExpirationTimestamp(): Long {
        return Instant.now().plus(TEMP_URL_VALID_MINUTES, ChronoUnit.MINUTES).epochSecond
    }

    private fun hmacSha256(data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(securityKeyManager.getSecretKeySpec())
        val hash = mac.doFinal(data.toByteArray(StandardCharsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }
}
