import axiosApi from "@/lib/axiosApi";
import type {
  ManagementFormType,
  ManagementType,
  ManagementUpdateType,
} from "@/types/managements";

export async function getManagements(): Promise<ManagementType[]> {
  const { data } = await axiosApi.get<ManagementType[]>("/managements/");
  return data;
}

export async function getManagement(id: number): Promise<ManagementType> {
  const { data } = await axiosApi.get<ManagementType>(`/managements/${id}`);
  return data;
}

export async function createManagement(
  body: ManagementFormType,
): Promise<ManagementType> {
  const { data } = await axiosApi.post<ManagementType>("/admin/managements/", body);
  return data;
}

export async function updateManagement({
  id,
  ...body
}: ManagementUpdateType): Promise<ManagementType> {
  const { data } = await axiosApi.put<ManagementType>(
    `/admin/managements/${id}`,
    body,
  );
  return data;
}

export async function deleteManagement(id: number): Promise<void> {
  await axiosApi.delete(`/admin/managements/${id}`);
}
