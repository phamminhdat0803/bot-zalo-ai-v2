# Database Schema Context

Cho phép query bằng mysql tool

Khi cần query dữ liệu, AI phải kiểm tra tool được phép và chỉ dùng tool readonly nếu backend cấp quyền.

## GLPI table aliases

- users/user -> glpi_users
- computers/computer -> glpi_computers
- tickets/ticket -> glpi_tickets
- printers/printer -> glpi_printers
- monitors/monitor -> glpi_monitors
- softwares/software -> glpi_softwares
- licenses/license -> glpi_softwarelicenses
- locations/location -> glpi_locations
- groups/group -> glpi_groups
- documents/document -> glpi_documents
- logs/log -> glpi_logs

Không tự đoán bảng ngoài schema/policy. Khi user dùng tên ngắn, dùng alias trên hoặc bảng `glpi_*` đã được allowlist.
