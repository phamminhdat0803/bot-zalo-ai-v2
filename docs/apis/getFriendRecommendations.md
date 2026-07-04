# getFriendRecommendations

URL: https://zca-js.tdung.com/vi/apis/getFriendRecommendations.html

# getFriendRecommendations

## api.getFriendRecommendations()

### Parameters

### Return

`Promise<FriendRecommendationsResponse>`

### Types

ts
```ts
export type FriendRecommendationsCollapseMsgListConfig = {
    collapseId: number;
    collapseXItem: number;
    collapseYItem: number;
};

export type FriendRecommendationsDataInfo = {
    userId: string;
    zaloName: string;
    displayName: string;
    avatar: string;
    phoneNumber: string;
    status: string;
    gender: Gender;
    dob: number;
    type: number;
    recommType: number;
    recommSrc: number;
    recommTime: number;
    recommInfo: {
        suggestWay: number;
        source: number;
        message: string;
        customText: string | null;
    };
    bizPkg: ZBusinessPackage;
    isSeenFriendReq: boolean;
};

export type FriendRecommendationsRecommItem = {
    recommItemType: number;
    dataInfo: FriendRecommendationsDataInfo;
};

export type FriendRecommendationsResponse = {
    expiredDuration: number;
    collapseMsgListConfig: FriendRecommendationsCollapseMsgListConfig;
    recommItems: FriendRecommendationsRecommItem[];
};
```

### Examples

ts
```ts
api.getFriendRecommendationsList()
    .then(console.log)
    .catch(console.error);
```