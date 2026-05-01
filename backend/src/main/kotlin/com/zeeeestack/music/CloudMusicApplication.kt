package com.zeeeestack.music

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

/**
 * 云音乐应用主类
 * 配置 Spring Boot 应用并启用定时任务支持
 */
@SpringBootApplication
@EnableScheduling
class CloudMusicApplication

/**
 * 应用入口函数
 * 启动 Spring Boot 应用
 */
fun main(args: Array<String>) {
    runApplication<CloudMusicApplication>(*args)
}
