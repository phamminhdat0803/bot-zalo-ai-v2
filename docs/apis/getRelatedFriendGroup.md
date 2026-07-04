# getRelatedFriendGroup

URL: https://zca-js.tdung.com/vi/apis/getRelatedFriendGroup.html

# getRelatedFriendGroup

## api.getRelatedFriendGroup(friendId)

### Parameters

*   friendId `string` | `string[]`

### Return

`Promise<GetRelatedFriendGroupResponse>`

### Types

ts
```ts
export type GetRelatedFriendGroupResponse = {
    groupRelateds: {
        [friendId: string]: string[]; // groupIds
    };
};
```

### Examples

ts
```ts
api.getRelatedFriendGroup("00000000000000000")
    .then(console.log)
    .catch(console.error);
```