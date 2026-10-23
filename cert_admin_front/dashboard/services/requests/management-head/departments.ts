import axiosApi from "@/lib/axiosApi";
import type {
  DepartmentCreateType,
  DepartmentLiteType,
  DepartmentUpdateType,
} from "@/types/departments";

const DEPARTMENTS_PATH = "/management-head/departments";

export async function createManagementHeadDepartment(
  body: DepartmentCreateType,
): Promise<DepartmentLiteType> {
  const res = await axiosApi.post(`${DEPARTMENTS_PATH}/`, body);
  return res.data;
}

export async function updateManagementHeadDepartment(
  body: DepartmentUpdateType,
): Promise<DepartmentLiteType> {
  const { id, ...payload } = body;
  const res = await axiosApi.put(`${DEPARTMENTS_PATH}/${id}`, payload);
  return res.data;
}

export async function deleteManagementHeadDepartment(
  id: string,
): Promise<void> {
  await axiosApi.delete(`${DEPARTMENTS_PATH}/${id}`);
}
