const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/download', async (req, res) => {
    const { tweetUrl } = req.body;

    try {
        const match = tweetUrl.match(/\/status\/(\d+)/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid Twitter/X URL structure.' });
        }
        const tweetId = match[1];

        // Use multiple fallback public endpoints that power Twitter embeds
        const endpoints = [
            `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=1`,
            `https://syndication.twitter.com/intent/tweet?status_id=${tweetId}`
        ];

        let data = null;

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    }
                });
                
                if (response.ok) {
                    const textData = await response.text();
                    try {
                        data = JSON.parse(textData);
                        if (data && (data.mediaDetails || data.entities?.media)) break;
                    } catch (e) {
                        // If it's HTML, we skip or parse if needed
                    }
                }
            } catch (innerErr) {
                // Try next endpoint
            }
        }

        // Ultimate fallback: Use FXTwitter / VXTweet public API layer (Open source standard for developers)
        if (!data || (!data.mediaDetails && !data.entities?.media)) {
            const fxResponse = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
            if (fxResponse.ok) {
                const fxData = await fxResponse.json();
                if (fxData && fxData.media_extended && fxData.media_extended.length > 0) {
                    const videoMedia = fxData.media_extended.find(m => m.type === 'video' || m.type === 'gif');
                    if (videoMedia) {
                        return res.json({
                            text: fxData.text || '',
                            author: fxData.user_name || 'Unknown',
                            username: fxData.user_screen_name || '',
                            avatar: fxData.user_profile_image_url || '',
                            thumbnail: videoMedia.thumbnail_url || '',
                            videos: [{ url: videoMedia.url, bitrate: 2000000 }]
                        });
                    }
                }
            }
        }

        if (!data) {
            return res.status(404).json({ error: 'Could not resolve tweet data. The post might be private or deleted.' });
        }

        let mediaSource = data?.mediaDetails?.[0] || data?.entities?.media?.[0];

        if (!mediaSource || (mediaSource.type !== 'video' && mediaSource.type !== 'animated_gif')) {
            return res.status(404).json({ error: 'No video content found in this tweet. Ensure the link points directly to a video post.' });
        }

        const variants = mediaSource.video_info?.variants
            ? mediaSource.video_info.variants.filter(v => v.content_type === 'video/mp4').sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
            : [];

        if (variants.length === 0) {
            return res.status(404).json({ error: 'Video variants could not be parsed.' });
        }

        res.json({
            text: data.text || '',
            author: data.user?.name || 'Unknown',
            username: data.user?.screen_name || '',
            avatar: data.user?.profile_image_url_https || '',
            thumbnail: mediaSource.media_url_https || '',
            videos: variants
        });

    } catch (err) {
        console.error("Scraper error:", err);
        res.status(500).json({ error: 'Server error processing the video request.' });
    }
});

// Proxy Download Route
app.get('/api/proxy-download', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing video URL parameter' });
    }

    res.setHeader('Content-Disposition', 'attachment; filename="twitter-video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    https.get(videoUrl, (externalRes) => {
        externalRes.pipe(res);
    }).on('error', (err) => {
        console.error(err);
        res.status(500).json({ error: 'Failed to download video stream.' });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));