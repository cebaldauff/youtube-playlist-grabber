import fetch from 'node-fetch';
import fs from 'fs';

async function mainplaylists() {
    const API_KEY = process.env["API_KEY"];
    const listofplaylists = (await (await fetch(`https://youtube.googleapis.com/youtube/v3/playlists?part=snippet%2CcontentDetails&channelId=UCPmLjfSUj3L-Xy9dmQk4rgw&maxResults=500&key=${API_KEY}`)).json()).items

    console.log(listofplaylists);
    let playlistids = [];
    let playlistnames = [];
    for(let i = 0; i < listofplaylists.length; i++) {
        const playlist = listofplaylists[i];
        playlistids.push(playlist.id);
        playlistnames.push(playlist.snippet.title)
    }
    let playlistsVideos = {};
    let nextpagetoken = "";
    for(let i = 0; i < playlistids.length; i++) {
        const playlistid = playlistids[i];
        let videoids = [];
        while(nextpagetoken !== undefined) {
            const playlistdatastuff = (await(await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails&maxResults=500&playlistId=${playlistid}&key=${API_KEY}${(i > 0) ? `&pageToken=${nextpagetoken}` : ''}`)).json())
            const playlistcontents = playlistdatastuff.items
            for(let j = 0; j < playlistcontents.length; j++) {
                const video = playlistcontents[j];
                videoids.push(video.snippet.resourceId.videoId);
            }
            console.log(nextpagetoken)
            nextpagetoken = playlistdatastuff.nextPageToken;
        }
        playlistsVideos[playlistid] = videoids;
        nextpagetoken = "";
    }
    
    fs.writeFile ("data/playlistnames.json", JSON.stringify(playlistnames), function(err) {
        if (err) throw err;
        console.log('complete');
        }
    );
    
    fs.writeFile ("data/videos.json", JSON.stringify(playlistsVideos), function(err) {
        if (err) throw err;
        console.log('complete');
        }
    );

    // post to new youtube channel
    for(const [key, value] of Object.entries(playlistsVideos)) {
        let i = 0;
        const playlistData = {
            "snippet": {
              "title": playlistnames[i],
              "description": "",
              "defaultLanguage": "en"
            },
            "status": {
              "privacyStatus": "public"
            }
        };
        const createplaylist = await(await fetch(`https://youtube.googleapis.com/youtube/v3/playlists?part=snippet%2Cstatus&key=${API_KEY}`, { // TODO: this needs Oauth2 token to validate
            method: "POST",
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(playlistData)
          })).json();
        const newPlaylistId = createplaylist.id; // TODO: check this is the correct field
        for(let j = 0; j < value.length; j++) {
            const videoData = {
                "snippet": {
                  "playlistId": newPlaylistId,
                  "position": 0,
                  "resourceId": {
                    "kind": "youtube#video",
                    "videoId": value[j]
                  }
                }
            };
            const addvideo = await(await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${API_KEY}`, { // TODO: check this is correct format
                method: "POST",
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(videoData)
            })).json()
        }
        i++;
    }
}

mainplaylists();
