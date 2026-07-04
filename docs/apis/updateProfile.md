# updateProfile

URL: https://zca-js.tdung.com/vi/apis/updateProfile.html

# updateProfile

## api.updateProfile(payload)

### Parameters

*   payload `UpdateProfilePayload`

### Return

`Promise<UpdateProfileResponse>`

### Types

ts
```ts
export type UpdateProfilePayload = {
    profile: {
        name: string;
        dob: `${string}-${string}-${string}`; // yyyy-mm-dd
        gender: Gender;
    };
    biz?: Partial<{
        cate: BusinessCategory;
        description: string;
        address: string;
        website: string;
        email: string;
    }>;
};

export type UpdateProfileResponse = "";
```

### Examples

ts
```ts
import { Gender, BusinessCategory } from "zca-js";

api
    .updateProfile({
        profile: {
            name: "Tên Tài Khoản",
            dob: "2000-12-22",
            gender: Gender.Male
        },
        // dành cho zBusiness
        biz: {
            cate: BusinessCategory.TechnologyAndDevices
        }
    })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [Gender](./../models/Enum.html)
*   [BusinessCategory](./../models/ZBusiness.html)