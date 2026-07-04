# reviewPendingMemberRequest

URL: https://zca-js.tdung.com/vi/apis/reviewPendingMemberRequest.html

# reviewPendingMemberRequest

## api.reviewPendingMemberRequest(payload, groupId)

### Parameters

*   payload `ReviewPendingMemberRequestPayload`
*   groupId `string`

### Return

`Promise<ReviewPendingMemberRequestResponse>`

### Types

ts
```ts
export type ReviewPendingMemberRequestPayload = {
    members: string | string[];
    isApprove: boolean;
};

export enum ReviewPendingMemberRequestStatus {
    SUCCESS = 0,
    NOT_IN_PENDING_LIST = 170,
    ALREADY_IN_GROUP = 178,
    INSUFFICIENT_PERMISSION = 166,
}

export type ReviewPendingMemberRequestResponse = {
    [memberId: string]: ReviewPendingMemberRequestStatus;
};
```

### Examples

ts
```ts
const groupId = "000000000000000";

api
    .reviewPendingMemberRequest(
        {
            members: ["000000000000001", "000000000000002"],
            isApprove: true,
        },
        groupId
    )
    .then(console.log).catch(console.error);
```