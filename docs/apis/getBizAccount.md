# getBizAccount

URL: https://zca-js.tdung.com/vi/apis/getBizAccount.html

# getBizAccount

## api.getBizAccount()

### Parameters

### Return

`Promise<GetBizAccountResponse>`

### Types

ts
```ts
export type GetBizAccountResponse = {
    biz?: {
        desc: string | null;
        cate: BusinessCategory;
        addr: string;
        website: string;
        email: string;
    };
    setting_start_page?: {
        enable_biz_label: number;
        enable_cate: number;
        enable_add: number;
        cta_profile: number;
        /**
         * Đường dẫn tương đối để xây dựng URL danh mục sản phẩm.
         *
         * vd: https://catalog.zalo.me/${cta_catalog}
         */
        cta_catalog: string | null;
    } | null;
    pkgId: number;
};
```

### Examples

ts
```ts
api.getBizAccount()
    .then(console.log)
    .catch(console.error);
```