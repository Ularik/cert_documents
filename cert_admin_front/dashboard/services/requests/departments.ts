import axiosApi from "@/lib/axiosApi";
import type {
  DepartmentLiteType,
  DepartmentType,
  DepartmentCreateType,
  DepartmentUpdateType,
} from "@/types/departments";

export async function getDepartments(): Promise<DepartmentType[]> {
  const res = await axiosApi.get("/departments/");
  return res.data;
}

export async function createDepartments(
  body: DepartmentCreateType,
): Promise<DepartmentLiteType> {
  const res = await axiosApi.post("/admin/departments/", body);
  return res.data;
}

export async function getDepartmentById(
  department_id: string,
): Promise<DepartmentType> {
  const res = await axiosApi.get(`/departments/${department_id}`);
  return res.data;
}

export async function updateDepartment(
  body: DepartmentUpdateType,
): Promise<DepartmentLiteType> {
  const { id, ...payload } = body;
  const res = await axiosApi.put(`/admin/departments/${id}`, payload);
  return res.data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await axiosApi.delete(`/admin/departments/${id}`);
}