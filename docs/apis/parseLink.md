# parseLink

URL: https://zca-js.tdung.com/vi/apis/parseLink.html

# parseLink

## api.parseLink(link)

### Parameters

*   link `string`

### Return

`Promise<ParseLinkResponse>`

### Types

ts
```ts
export type ParseLinkErrorMaps = Record<string, number>;

export type ParseLinkResponse = {
    data: {
        thumb: string;
        title: string;
        desc: string;
        src: string;
        href: string;
        media: {
            type: number;
            count: number;
            mediaTitle: string;
            artist: string;
            streamUrl: string;
            stream_icon: string;
        };
        stream_icon: string;
    };
    error_maps: ParseLinkErrorMaps;
};
```

### Examples

ts
```ts
api.parseLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    .then(console.log)
    .catch(console.error);
```