import React, { useState, useEffect } from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormCheck, FormSelect } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import StandardizedTable from "@/components/StandardizedTable";
import Pagination from "@/components/Base/Pagination";
import { userManagementService } from "@/services/userManagement";
import { UserManagement, CreateUserDTO } from "@/types/userManagement";
import { toast } from "react-toastify";
import clsx from "clsx";
import dayjs from "dayjs";

function UserManagementPage() {
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Form state
  const [formData, setFormData] = useState<CreateUserDTO>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, filterActive]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const filters: any = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }

      if (filterActive !== "all") {
        filters.is_active = filterActive === "active";
      }

      const response = await userManagementService.getUsers(filters);
      
      // Calculate account age for each user
      const usersWithAge = response.results.map(user => ({
        ...user,
        account_age_days: user.account_creation 
          ? Math.floor((new Date().getTime() - new Date(user.account_creation).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }));
      
      setUsers(usersWithAge);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / pageSize));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await userManagementService.createUser(formData);
      toast.success("User created successfully");
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.email?.[0] || 
                          error?.response?.data?.username?.[0] || 
                          "Failed to create user";
      toast.error(errorMessage);
    }
  };

  const handleToggleUserStatus = async (user: UserManagement) => {
    try {
      await userManagementService.updateUserStatus(user.id, !user.is_active);
      toast.success(`User ${!user.is_active ? "activated" : "deactivated"} successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await userManagementService.deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      is_active: true,
    });
    setFormErrors({});
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      return dayjs(dateString).format("MMM DD, YYYY HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterActive(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        {/* Header */}
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="text-base font-medium group-[.mode--light]:text-white">
            User Management
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="group-[.mode--light]:!bg-white/[0.12] group-[.mode--light]:!text-slate-200 group-[.mode--light]:!border-transparent"
            >
              <Lucide icon="UserPlus" className="stroke-[1.3] w-4 h-4 mr-2" />
              Add New User
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mt-3.5">
          <div className="flex flex-col p-5 box box--stacked">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="col-span-1 md:col-span-2">
                <FormLabel htmlFor="search">Search Users</FormLabel>
                <FormInput
                  id="search"
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="col-span-1">
                <FormLabel htmlFor="filter-status">Status Filter</FormLabel>
                <FormSelect
                  id="filter-status"
                  value={filterActive}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </FormSelect>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="p-4 border border-dashed rounded-lg border-slate-300/80">
                <div className="text-sm text-slate-500">Total Users</div>
                <div className="mt-1 text-xl font-medium">{totalCount}</div>
              </div>
              <div className="p-4 border border-dashed rounded-lg border-slate-300/80">
                <div className="text-sm text-slate-500">Active Users</div>
                <div className="mt-1 text-xl font-medium text-success">
                  {users.filter((u) => u.is_active).length}
                </div>
              </div>
              <div className="p-4 border border-dashed rounded-lg border-slate-300/80">
                <div className="text-sm text-slate-500">Inactive Users</div>
                <div className="mt-1 text-xl font-medium text-danger">
                  {users.filter((u) => !u.is_active).length}
                </div>
              </div>
              <div className="p-4 border border-dashed rounded-lg border-slate-300/80">
                <div className="text-sm text-slate-500">Current Page</div>
                <div className="mt-1 text-xl font-medium">
                  {currentPage} / {totalPages}
                </div>
              </div>
            </div>

            {/* Table */}
            <StandardizedTable isLoading={loading} maxHeight="65vh">
              <StandardizedTable.Header>
                <StandardizedTable.Cell isHeader>First Name</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Last Name</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Email</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Last Login</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Account Created</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Account Age (Days)</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Status</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Actions</StandardizedTable.Cell>
              </StandardizedTable.Header>
              <tbody>
                {loading ? (
                  <StandardizedTable.LoadingSkeleton rows={8} cols={8} />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <StandardizedTable.Row key={user.id} index={index}>
                      <StandardizedTable.Cell>
                        {user.first_name || "-"}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.last_name || "-"}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <div className="flex items-center gap-2">
                          <Lucide icon="Mail" className="w-4 h-4 text-slate-400" />
                          {user.email}
                        </div>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {formatDate(user.last_login)}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {formatDate(user.account_creation)}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.account_age_days || 0}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <div
                          className={clsx(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            user.is_active
                              ? "bg-success/10 text-success"
                              : "bg-danger/10 text-danger"
                          )}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </div>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={user.is_active ? "outline-secondary" : "outline-success"}
                            size="sm"
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            <Lucide
                              icon={user.is_active ? "Ban" : "CheckCircle"}
                              className="w-4 h-4"
                            />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Lucide icon="Trash2" className="w-4 h-4" />
                          </Button>
                        </div>
                      </StandardizedTable.Cell>
                    </StandardizedTable.Row>
                  ))
                )}
              </tbody>
            </StandardizedTable>

            {/* Pagination */}
            {!loading && users.length > 0 && (
              <div className="flex flex-col-reverse flex-wrap items-center mt-5 gap-y-2 sm:flex-row">
                <Pagination className="flex-1 w-full mr-auto sm:w-auto">
                  <Pagination.Link
                    onClick={() => currentPage > 1 && setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  >
                    <Lucide icon="ChevronLeft" className="w-4 h-4" />
                  </Pagination.Link>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <Pagination.Link
                        key={pageNumber}
                        active={currentPage === pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </Pagination.Link>
                    );
                  })}
                  {totalPages > 5 && (
                    <Pagination.Link className="opacity-50 cursor-not-allowed">
                      ...
                    </Pagination.Link>
                  )}
                  <Pagination.Link
                    onClick={() => currentPage < totalPages && setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  >
                    <Lucide icon="ChevronRight" className="w-4 h-4" />
                  </Pagination.Link>
                </Pagination>
                <div className="text-slate-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="mr-auto text-base font-medium">Create New User</h2>
          </Dialog.Title>
          <Dialog.Description className="grid grid-cols-12 gap-4 gap-y-3">
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="username">
                Username <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className={formErrors.username ? "border-danger" : ""}
              />
              {formErrors.username && (
                <div className="mt-2 text-danger text-xs">{formErrors.username}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="email">
                Email <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="email"
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={formErrors.email ? "border-danger" : ""}
              />
              {formErrors.email && (
                <div className="mt-2 text-danger text-xs">{formErrors.email}</div>
              )}
            </div>
            <div className="col-span-12">
              <FormLabel htmlFor="password">
                Password <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="password"
                type="password"
                placeholder="Enter password (min 8 characters)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={formErrors.password ? "border-danger" : ""}
              />
              {formErrors.password && (
                <div className="mt-2 text-danger text-xs">{formErrors.password}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="first_name">
                First Name <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="first_name"
                type="text"
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className={formErrors.first_name ? "border-danger" : ""}
              />
              {formErrors.first_name && (
                <div className="mt-2 text-danger text-xs">{formErrors.first_name}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="last_name">
                Last Name <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="last_name"
                type="text"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className={formErrors.last_name ? "border-danger" : ""}
              />
              {formErrors.last_name && (
                <div className="mt-2 text-danger text-xs">{formErrors.last_name}</div>
              )}
            </div>
            <div className="col-span-12">
              <FormCheck>
                <FormCheck.Input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <FormCheck.Label htmlFor="is_active">
                  Active User
                </FormCheck.Label>
              </FormCheck>
            </div>
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="w-20 mr-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleCreateUser}
              className="w-20"
            >
              Create
            </Button>
          </Dialog.Footer>
        </Dialog.Panel>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Dialog.Panel>
          <div className="p-5 text-center">
            <Lucide
              icon="XCircle"
              className="w-16 h-16 mx-auto mt-3 text-danger"
            />
            <div className="mt-5 text-3xl">Are you sure?</div>
            <div className="mt-2 text-slate-500">
              Do you really want to delete this user?
              <br />
              <strong>
                {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.email})
              </strong>
              <br />
              This process cannot be undone.
            </div>
          </div>
          <div className="px-5 pb-8 text-center">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              className="w-24 mr-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleDeleteUser}
              className="w-24"
            >
              Delete
            </Button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}

export default UserManagementPage;
