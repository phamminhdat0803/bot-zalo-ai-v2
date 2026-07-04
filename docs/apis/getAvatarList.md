# getAvatarList

URL: https://zca-js.tdung.com/vi/apis/getAvatarList.html

# getAvatarList

## api.getAvatarList()

### Parameters

### Return

`Promise<GetAvatarListResponse>`

### Types

ts
```ts
export type GetAvatarListResponse = {
    albumId: string;
    nextPhotoId: string;
    hasMore: number;
    photos: {
        photoId: string;
        thumbnail: string;
        url: string;
        bkUrl: string;
    }[];
};
```

### Examples

ts
```ts
api.getAvatarList()
    .then(console.log)
    .catch(console.error);
```