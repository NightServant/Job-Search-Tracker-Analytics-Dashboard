/**
 * Reads a file as text, whatever the environment offers.
 *
 * `File.text()` is the modern call and every current browser has it. It is
 * NOT universal: older Safari lacks it, and -- the reason this exists -- so
 * does the jsdom this project tests against. An `async` change handler calling
 * a missing method rejects silently, so an upload that could never work looked
 * exactly like an upload nobody had tried: the button did nothing and no test
 * caught it, because the tests never read a file.
 *
 * `FileReader` is the fallback, which is what `text()` replaced.
 */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'))
    reader.readAsText(file)
  })
}
