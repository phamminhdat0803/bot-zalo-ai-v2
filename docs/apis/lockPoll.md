# lockPoll

URL: https://zca-js.tdung.com/vi/apis/lockPoll.html

# lockPoll

## api.lockPoll(pollId)

### Parameters

*   pollId `number`

### Return

`Promise<LockPollResponse>`

### Types

ts
```ts
export type LockPollResponse = "";
```

### Examples

ts
```ts
const pollId = 1;
api.lockPoll(pollId)
    .then(console.log)
    .catch(console.error);
```