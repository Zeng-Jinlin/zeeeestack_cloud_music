package com.zeeeestack.music.model

data class Song(
    val songId: String,
    val title: String,
    val artist: String,
    val album: String? = null,
    val duration: Long,
    val hasCover: Boolean,
    val lastModified: Long
)
