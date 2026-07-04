# sendReport

URL: https://zca-js.tdung.com/vi/apis/sendReport.html

# sendReport

## api.sendReport(options, threadId\[, type\])

### Parameters

*   options `SendReportOptions`
    *   reason `ReportReason`
    *   content `string?`
        *   Nội dung báo xấu, chỉ cần nếu reason là `ReportReason.Other`
*   threadId `string`
*   type `ThreadType?`
    *   loại thread, mặc định là người dùng

### Return

`Promise<SendReportResponse>`

### Types

ts
```ts
export enum ReportReason {
    Sensitive = 1,
    Annoy = 2,
    Fraud = 3,
    Other = 0,
}

export type SendReportOptions =
    | {
          reason: ReportReason.Other;
          content: string;
      }
    | {
          reason: Exclude<ReportReason, ReportReason.Other>;
      };

export type SendReportResponse = {
    reportId: string;
};
```

### Examples

Báo xấu người dùng

ts
```ts
import { ReportReason } from "zca-js";
const userId = "0000000000000001"

api.sendReport(
    {
        reason: ReportReason.Fraud
    },
    userId
)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)