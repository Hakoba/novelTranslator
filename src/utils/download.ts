/** Скачивание готовых данных файлом: и колода Anki, и резервная копия уходят так */
export function downloadFile(
  data: BlobPart,
  fileName: string,
  type = 'application/octet-stream',
): void {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()

  URL.revokeObjectURL(url)
}
