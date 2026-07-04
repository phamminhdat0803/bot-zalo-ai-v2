# getAllGroups

URL: https://zca-js.tdung.com/vi/apis/getAllGroups.html

# getAllGroups

## api.getAllGroups()

### Parameters

### Return

`Promise<GetAllGroupsResponse>`

### Types

ts
```ts
export type GetAllGroupsResponse = {
    version: string;
    gridVerMap: {
        [groupId: string]: string;
    };
};
```

### Examples

ts
```ts
api.getAllGroups()
    .then(console.log)
    .catch(console.error);
```