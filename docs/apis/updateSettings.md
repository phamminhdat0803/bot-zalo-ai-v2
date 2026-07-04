# updateSettings

URL: https://zca-js.tdung.com/vi/apis/updateSettings.html

# updateSettings

## api.updateSettings(type, value)

### Parameters

*   type `UpdateSettingsType`
*   value `number`

#### Value

*   ViewBirthday
    *   0 - ẩn
    *   1 - hiện ngày/tháng/năm
    *   2 - hiện ngày/tháng
*   ShowOnlineStatus
    *   0 - ẩn
    *   1 - hiện
*   DisplaySeenStatus
    *   0 - ẩn
    *   1 - hiện
*   ReceiveMessage
    *   1 - mọi người
    *   2 - chỉ từ bạn bè
*   AcceptCall
    *   2 - chỉ từ bạn bè
    *   3 - mọi người
    *   4 - bạn bè và người lạ từng liên hệ
*   AddFriendViaPhone
    *   0 - tắt
    *   1 - bật
*   AddFriendViaQR
    *   0 - tắt
    *   1 - bật
*   AddFriendViaGroup
    *   0 - tắt
    *   1 - bật
*   AddFriendViaContact
    *   0 - tắt
    *   1 - bật
*   DisplayOnRecommendFriend
    *   0 - tắt
    *   1 - bật
*   ArchivedChat
    *   0 - tắt
    *   1 - bật
*   QuickMessage
    *   0 - tắt
    *   1 - bật

### Return

`Promise<UpdateSettingsResponse>`

### Types

ts
```ts
export type UpdateSettingsResponse = "";

export enum UpdateSettingsType {
    ViewBirthday = "view_birthday",
    ShowOnlineStatus = "show_online_status",
    DisplaySeenStatus = "display_seen_status",
    ReceiveMessage = "receive_message",
    AcceptCall = "accept_stranger_call",
    AddFriendViaPhone = "add_friend_via_phone",
    AddFriendViaQR = "add_friend_via_qr",
    AddFriendViaGroup = "add_friend_via_group",
    AddFriendViaContact = "add_friend_via_contact",
    DisplayOnRecommendFriend = "display_on_recommend_friend",
    ArchivedChat = "archivedChatStatus",
    QuickMessage = "quickMessageStatus",
};
```

### Examples

ts
```ts
import { UpdateSettingsType } from "zca-js";

api
    .updateSettings(UpdateSettingsType.AcceptCall, 2)
    .then(console.log)
    .catch(console.error);
```