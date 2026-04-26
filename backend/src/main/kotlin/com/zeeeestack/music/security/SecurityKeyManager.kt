package com.zeeeestack.music.security

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.io.File
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.crypto.spec.SecretKeySpec

@Service
class SecurityKeyManager(
    @Value("\${app.security.key-rotation-interval-days:7}")
    private val keyRotationIntervalDays: Long
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val keyFile = File("security-key.dat")
    private val secureRandom = SecureRandom()
    private val keyLock = Any()

    @Volatile
    private var currentKey: ByteArray = generateNewKey()

    @Volatile
    private var lastRotationTime: Instant = Instant.now()

    init {
        loadOrGenerateKey()
    }

    fun getCurrentKey(): ByteArray {
        synchronized(keyLock) {
            return currentKey.copyOf()
        }
    }

    fun getSecretKeySpec(): SecretKeySpec {
        return SecretKeySpec(getCurrentKey(), "HmacSHA256")
    }

    @Scheduled(fixedRate = 3600000)
    fun checkKeyRotation() {
        val now = Instant.now()
        val daysSinceRotation = ChronoUnit.DAYS.between(lastRotationTime, now)

        if (daysSinceRotation >= keyRotationIntervalDays) {
            rotateKey()
        }
    }

    fun rotateKey() {
        synchronized(keyLock) {
            logger.info("Rotating security key")
            currentKey = generateNewKey()
            lastRotationTime = Instant.now()
            saveKey()
            logger.info("Security key rotated successfully")
        }
    }

    private fun loadOrGenerateKey() {
        synchronized(keyLock) {
            if (keyFile.exists()) {
                try {
                    val content = keyFile.readText().trim()
                    val parts = content.split("|")
                    if (parts.size == 2) {
                        currentKey = hexStringToByteArray(parts[0])
                        lastRotationTime = Instant.parse(parts[1])
                        logger.info("Loaded existing security key")
                        return
                    }
                } catch (e: Exception) {
                    logger.warn("Failed to load existing key, generating new one", e)
                }
            }
            currentKey = generateNewKey()
            lastRotationTime = Instant.now()
            saveKey()
        }
    }

    private fun saveKey() {
        val content = "${byteArrayToHexString(currentKey)}|${lastRotationTime}"
        keyFile.writeText(content)
    }

    private fun generateNewKey(): ByteArray {
        val key = ByteArray(32)
        secureRandom.nextBytes(key)
        return key
    }

    private fun byteArrayToHexString(bytes: ByteArray): String {
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun hexStringToByteArray(hex: String): ByteArray {
        return hex.chunked(2)
            .map { it.toInt(16).toByte() }
            .toByteArray()
    }
}
