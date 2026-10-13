/**
 * Extrae letras embebidas (TTML o LRC) de los metadatos o del contenido binario del archivo de audio.
 */
export async function extractEmbeddedLyrics(
	metadata?: Record<string, string>,
	file?: File | Blob,
): Promise<string | null> {
	// 1. Verificar el diccionario de metadatos de FFmpeg
	if (metadata) {
		const lyricKeys = [
			"lyrics",
			"ttml",
			"unsyncedlyrics",
			"syncedlyrics",
			"©lyr",
			"\xa9lyr",
			"uslt",
			"lyric",
			"comment",
			"description",
		];

		// Búsqueda por clave directa (insensible a mayúsculas)
		for (const key of lyricKeys) {
			for (const [metaKey, metaVal] of Object.entries(metadata)) {
				if (metaKey.toLowerCase() === key || metaKey.toLowerCase().includes(key)) {
					if (metaVal && metaVal.trim().length > 0) {
						return metaVal.trim();
					}
				}
			}
		}

		// Búsqueda por contenido (si algún valor tiene <tt o [00:)
		for (const val of Object.values(metadata)) {
			if (typeof val === "string") {
				if (val.includes("<tt") || (val.includes("[00:") && val.includes("]"))) {
					return val.trim();
				}
			}
		}
	}

	// 2. Si no se encontró en metadata y tenemos el archivo binario (M4A, MP3, FLAC)
	if (file) {
		try {
			// Leemos hasta 12 MB del inicio para cubrir ID3/FLAC en header y MP4 moov atom
			const maxSliceSize = Math.min(file.size, 12 * 1024 * 1024);
			const headBuffer = await file.slice(0, maxSliceSize).arrayBuffer();
			const textDecoder = new TextDecoder("utf-8", { fatal: false });
			const headText = textDecoder.decode(headBuffer);

			// Buscar bloque TTML en el header
			const ttmlIndex = headText.indexOf("<tt");
			if (ttmlIndex !== -1) {
				const ttmlEnd = headText.indexOf("</tt>", ttmlIndex);
				if (ttmlEnd !== -1) {
					return headText.substring(ttmlIndex, ttmlEnd + 5);
				}
			}

			// Si el archivo es grande y el atom moov de MP4 está al final:
			if (file.size > maxSliceSize) {
				const tailSliceSize = Math.min(file.size, 10 * 1024 * 1024);
				const tailBuffer = await file.slice(file.size - tailSliceSize).arrayBuffer();
				const tailText = textDecoder.decode(tailBuffer);
				const tailTtmlIndex = tailText.indexOf("<tt");
				if (tailTtmlIndex !== -1) {
					const tailTtmlEnd = tailText.indexOf("</tt>", tailTtmlIndex);
					if (tailTtmlEnd !== -1) {
						return tailText.substring(tailTtmlIndex, tailTtmlEnd + 5);
					}
				}
			}
		} catch (err) {
			console.warn("Error inspeccionando archivo binario para letras:", err);
		}
	}

	return null;
}
