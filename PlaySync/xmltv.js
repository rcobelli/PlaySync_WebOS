const XMLTV_URL = 'http://192.168.0.100:8000/xmltv.xml';

/**

* Downloads and parses the XMLTV file.
* Returns { channels, programmes }.
  */
async function loadXMLTV() {
    const response = await fetch(XMLTV_URL);

    if (!response.ok) {
        throw new Error(
            `Failed to download XMLTV: HTTP ${response.status}`
        );
    }

    const xmlText = await response.text();
    const xml = new DOMParser().parseFromString(
        xmlText,
        'application/xml'
    );

    // Detect malformed XML.
    if (xml.querySelector('parsererror')) {
        throw new Error('The XMLTV file contains invalid XML');
    }

    const channels = Array.from(
        xml.querySelectorAll('tv > channel')
    ).map(channel => ({
        id: channel.getAttribute('id'),
        displayNames: Array.from(
            channel.querySelectorAll(':scope > display-name')
        ).map(el => el.textContent.trim()),
        icon: channel.querySelector(':scope > icon')
            ?.getAttribute('src') ?? null
    }));

    const programmes = Array.from(
        xml.querySelectorAll('tv > programme')
    ).map(programme => {
        const categories = Array.from(
            programme.querySelectorAll(':scope > category')
        ).map(el => el.textContent.trim()).filter(Boolean);

        return {
            channel: programme.getAttribute('channel'),
            start: programme.getAttribute('start'),
            stop: programme.getAttribute('stop'),
            title: programme.querySelector('title')?.textContent.trim() ?? '',
            description:
                programme.querySelector('desc')?.textContent.trim() ?? '',
            category: categories[0] ?? '',
            categories
        };
    });

    return { channels, programmes };
}

// Example usage.
loadXMLTV()
    .then(({ channels, programmes }) => {
    })
    .catch(error => {
        console.error('Unable to load XMLTV:', error);
    });
