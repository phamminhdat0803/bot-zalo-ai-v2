# getGroupLinkDetail

URL: https://zca-js.tdung.com/vi/apis/getGroupLinkDetail.html

# getGroupLinkDetail

## api.getGroupLinkDetail(groupId)

### Parameters

*   groupId `string`

### Return

`Promise<GetGroupLinkDetailResponse>`

### Types

ts
```ts
export type GetGroupLinkDetailResponse = {
    link?: string;
    expiration_date?: number;
    /**
     * 1: enabled, 0: disabled
     */
    enabled: number;
};
```

### Examples

ts
```ts
const groupId = "0000000000000000000";
api.getGroupLinkDetail(groupId)
    .then(console.log)
    .catch(console.error);
```