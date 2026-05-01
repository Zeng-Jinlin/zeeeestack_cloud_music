package com.zeeeestack.music.ratelimiter

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

@Service
class RateLimiterService {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val bannedKeys = ConcurrentHashMap<String, Long>()
    private val songRequestLogs = ConcurrentHashMap<String, MutableList<Long>>()
    private val globalRequestLogs = ConcurrentHashMap<String, MutableList<Long>>()

    companion object {
        private const val SONG_LIMIT_WINDOW_MS = 3000L
        private const val SONG_LIMIT_MAX = 6
        private const val GLOBAL_LIMIT_WINDOW_MS = 1000L
        private const val GLOBAL_LIMIT_MAX = 5
        private const val BAN_DURATION_MS = 600000L
        private const val CLEANUP_INTERVAL_MS = 60000L
        private val LOCAL_IPS = setOf("127.0.0.1", "0:0:0:0:0:0:0:1", "::1")
    }

    fun checkRequest(ip: String, cookieFingerprint: String?, songId: String): Boolean {
        val now = System.currentTimeMillis()

        if (LOCAL_IPS.contains(ip)) {
            logger.debug("本地 IP 兜底放行：$ip")
            return true
        }

        val ipCookieKey = buildIpCookieKey(ip, cookieFingerprint)

        bannedKeys[ipCookieKey]?.let { banUntil ->
            if (now < banUntil) {
                logger.warn("设备被封禁：$ipCookieKey, 直到 $banUntil")
                return false
            }
            bannedKeys.remove(ipCookieKey)
        }

        val songKey = "${ipCookieKey}_$songId"

        if (!checkSongLimit(songKey, now)) {
            logger.warn("单歌限流触发：$ipCookieKey, songId=$songId")
            return false
        }

        if (!checkGlobalLimit(ipCookieKey, now)) {
            logger.warn("全站限流触发，封禁设备：$ipCookieKey")
            bannedKeys[ipCookieKey] = now + BAN_DURATION_MS
            return false
        }

        return true
    }

    private fun buildIpCookieKey(ip: String, cookieFingerprint: String?): String {
        val fingerprint = cookieFingerprint?.trim()?.take(200) ?: "unknown"
        return "${ip}_$fingerprint"
    }

    private fun checkSongLimit(key: String, now: Long): Boolean {
        val logs = songRequestLogs.computeIfAbsent(key) { mutableListOf() }
        logs.removeAll { it < now - SONG_LIMIT_WINDOW_MS }
        if (logs.size >= SONG_LIMIT_MAX) {
            return false
        }
        logs.add(now)
        return true
    }

    private fun checkGlobalLimit(key: String, now: Long): Boolean {
        val logs = globalRequestLogs.computeIfAbsent(key) { mutableListOf() }
        logs.removeAll { it < now - GLOBAL_LIMIT_WINDOW_MS }
        if (logs.size >= GLOBAL_LIMIT_MAX) {
            return false
        }
        logs.add(now)
        return true
    }

    @Scheduled(fixedRate = CLEANUP_INTERVAL_MS)
    fun cleanupExpiredRecords() {
        val now = System.currentTimeMillis()
        val cleanedCount = AtomicInteger(0)

        bannedKeys.entries.removeIf { entry ->
            val removed = entry.value < now
            if (removed) cleanedCount.incrementAndGet()
            removed
        }

        songRequestLogs.entries.removeIf { entry ->
            entry.value.removeAll { it < now - SONG_LIMIT_WINDOW_MS }
            val removed = entry.value.isEmpty()
            if (removed) cleanedCount.incrementAndGet()
            removed
        }

        globalRequestLogs.entries.removeIf { entry ->
            entry.value.removeAll { it < now - GLOBAL_LIMIT_WINDOW_MS }
            val removed = entry.value.isEmpty()
            if (removed) cleanedCount.incrementAndGet()
            removed
        }

        if (cleanedCount.get() > 0) {
            logger.info("清理过期记录：${cleanedCount.get()} 条")
        }
    }

    fun getStats(): Map<String, Any> {
        return mapOf(
            "bannedKeys" to bannedKeys.size,
            "songRequestLogs" to songRequestLogs.size,
            "globalRequestLogs" to globalRequestLogs.size
        )
    }
}
