# Reddit Launch Posts — VeriMedia

Post one per day, spaced out. Use a personal account with some history if possible.
Don't post the same copy to multiple subs — each is written for that community's tone.

---

## r/photography

**Title:** I built a tool that embeds an AI training opt-out tag directly into your image files

I shoot a lot and kept seeing my photos in reverse-image searches on AI output sites. I wanted something that would embed the `ai:opt-out=true` XMP signal into my files before I upload them anywhere — the same signal that GPTBot, ClaudeBot, and Common Crawl publicly commit to honouring.

Couldn't find anything that worked client-side (no uploads, no accounts), so I built it: **verimedia.xyz**

It runs entirely in the browser. Drop a JPEG, PNG, WebP, HEIC, or PDF — it strips GPS/EXIF tracking data and embeds the opt-out tag, then you download the clean file. Nothing is sent anywhere.

Free for single files. Paid tier for batch processing.

Happy to answer questions about how the XMP embedding works if anyone's curious.

---

## r/photojournalism

**Title:** Tool to strip author metadata and embed AI opt-out signals from images before sharing — browser-only, zero uploads

For anyone who shares images externally and worries about metadata exposure or AI scraping:

I made **verimedia.xyz** — it runs fully client-side (nothing is uploaded, nothing leaves your machine). It:

- Removes GPS coordinates, device serial numbers, and forensic metadata from JPEGs/PDFs
- Embeds the standardised `ai:opt-out=true` XMP tag that major AI crawlers honour
- Works on HEIC (iPhone), WebP, and PDF too

The PDF scrubbing physically overwrites internal metadata streams — Author, Creator, Producer, CreationDate — not just clears the visible fields.

Free for single files. Thought it might be useful for people here given the nature of the work.

---

## r/AIArt

**Title:** Made a free tool to opt your images out of AI training datasets — embeds the tag directly into the file

Whether you're for or against AI art, I think creators should have a clear way to signal their preferences. The `ai:opt-out=true` XMP standard exists for this — GPTBot, ClaudeBot, and Common Crawl all publicly state they honour it.

The problem: there was no easy way to actually embed this tag into your existing image files.

So I built **verimedia.xyz**. Drop any JPEG, PNG, WebP, or HEIC — it embeds the opt-out tag and downloads the file back to you. Runs entirely in your browser, no upload, no account.

Free for single files.

---

## r/selfhosted

**Title:** I built a client-side image metadata tool — strips EXIF/GPS, embeds AI opt-out XMP tags, zero server involvement

**verimedia.xyz** — runs 100% in the browser using JS.

What it does:
- Strips GPS IFD segments, device fingerprints, camera serial numbers from JPEG/PNG/WebP/HEIC
- Physically overwrites PDF metadata streams (Author, Creator, Producer, CreationDate)
- Embeds `ai:opt-out=true` in binary XMP format (compatible with GPTBot, ClaudeBot, Common Crawl)
- Optionally injects creator name + copyright + WebStatement URL (for Google Licensable Badge)

No files are sent to any server at any point. Everything is in-browser JS — you could technically run it offline once the page is cached.

Source isn't open yet but happy to discuss the XMP binary format implementation if anyone's interested. It's surprisingly fiddly to get right across JPEG, PNG, and PDF simultaneously.

Free tier for single files. Paid for batch (100 or unlimited).
