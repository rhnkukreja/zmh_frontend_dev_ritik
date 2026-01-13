import React, { useState, useEffect, useCallback, useRef } from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormCheck } from "@/components/Base/Form";
import { Dialog } from "@/components/Base/Headless";
import StandardizedTable from "@/components/StandardizedTable";
import Pagination from "@/components/Base/Pagination";
import { userManagementService } from "@/services/userManagement";
import { UserManagement, CreateUserDTO, UpdateUserDTO, UserType, SubscriptionType } from "@/types/userManagement";
import { toast } from "react-toastify";
import clsx from "clsx";

// Constants
const PAGE_SIZE = 20;
const DEBOUNCE_DELAY = 400;

const USER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "Client", label: "Client" },
  { value: "ZMH Employee", label: "ZMH Employee" },
];

const SUBSCRIPTION_OPTIONS: { value: SubscriptionType; label: string }[] = [
  { value: "Trial", label: "Trial" },
  { value: "Trial Ended", label: "Trial Ended" },
  { value: "Paying", label: "Paying" },
];

function UserManagementPage() {
  // ==================== STATE ====================
  
  // User list state
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Counts state (from separate API)
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<string>("");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);
  
  // Multi-select state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [selectionType, setSelectionType] = useState<'active' | 'inactive' | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<'first_name' | 'last_name' | 'user_company' | 'email' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Form state for create
  const [createFormData, setCreateFormData] = useState<CreateUserDTO>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    is_active: true,
    user_type: "Client" as any,
    subscription: "Trial",
    duration_days: 30,
    user_company: "ZMH Advisors",
  });
  
  // Form state for edit
  const [editFormData, setEditFormData] = useState<UpdateUserDTO>({
    email: "",
    first_name: "",
    last_name: "",
    is_active: true,
    user_type: "Client" as any,
    subscription: "Trial",
    duration_days: 30,
    user_company: "ZMH Advisors",
    password: "",
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Refs for debounce
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedInitial = useRef(false);

  // ==================== API CALLS ====================
  
  /**
   * Fetch counts from regular API (count is in response)
   */
  const fetchCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [totalRes, activeRes, inactiveRes] = await Promise.all([
        userManagementService.getUsers({ page: 1, page_size: 1 }),
        userManagementService.getUsers({ page: 1, page_size: 1, is_active: true }),
        userManagementService.getUsers({ page: 1, page_size: 1, is_active: false }),
      ]);
      setTotalCount(totalRes.count);
      setActiveCount(activeRes.count);
      setInactiveCount(inactiveRes.count);
    } catch (error: any) {
      console.error("Failed to fetch counts:", error);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  /**
   * Fetch users list with query params
   */
  const fetchUsers = useCallback(async (
    page: number,
    search: string,
    active: boolean | null,
    userType: string = "",
    subscription: string = ""
  ) => {
    setTableLoading(true);
    try {
      const filters: any = {
        page,
        page_size: PAGE_SIZE,
      };

      if (search.trim()) {
        filters.search = search.trim();
      }

      if (active !== null) {
        filters.is_active = active;
      }

      if (userType) {
        filters.user_type = userType;
      }

      if (subscription) {
        filters.subscription = subscription;
      }

      const response = await userManagementService.getUsers(filters);
      setUsers(response.results);
      setListTotal(response.count);
      setTotalPages(Math.ceil(response.count / PAGE_SIZE));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
      setUsers([]);
      setListTotal(0);
      setTotalPages(1);
    } finally {
      setTableLoading(false);
    }
  }, []);

  // ==================== EFFECTS ====================

  // Initial load only - runs once on mount
  useEffect(() => {
    fetchCounts();
    fetchUsers(1, "", null, "", "");
    hasFetchedInitial.current = true;
  }, []);

  // Handle search with debounce - only after initial load
  useEffect(() => {
    if (!hasFetchedInitial.current) return;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
    }, DEBOUNCE_DELAY);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  // ==================== HANDLERS ====================

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleUserTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setUserTypeFilter(value);
    setCurrentPage(1);
    fetchUsers(1, searchTerm, activeFilter, value, subscriptionFilter);
  };

  const handleSubscriptionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSubscriptionFilter(value);
    setCurrentPage(1);
    fetchUsers(1, searchTerm, activeFilter, userTypeFilter, value);
  };

  const handleFilterClick = (filter: boolean | null) => {
    if (activeFilter === filter) return;
    setActiveFilter(filter);
    setCurrentPage(1);
    fetchUsers(1, searchTerm, filter, userTypeFilter, subscriptionFilter);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    fetchUsers(page, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
  };

  // ==================== CREATE USER ====================

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createFormData.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!createFormData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    if (!createFormData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(createFormData.email)) {
      errors.email = "Email is invalid";
    }

    if (!createFormData.password.trim()) {
      errors.password = "Password is required";
    } else if (createFormData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!createFormData.user_type) {
      errors.user_type = "User type is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateCreateForm()) return;

    try {
      // Send email as username
      const payload = {
        ...createFormData,
        username: createFormData.email,
      };
      await userManagementService.createUser(payload);
      toast.success("User created successfully");
      setShowCreateModal(false);
      resetCreateForm();
      fetchCounts();
      fetchUsers(currentPage, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.username?.[0] ||
        "Failed to create user";
      toast.error(errorMessage);
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      is_active: true,
      user_type: "Client" as any,
      subscription: "Trial",
      duration_days: 30,
      user_company: "ZMH Advisors",
    });
    setFormErrors({});
  };

  // ==================== EDIT USER ====================

  const handleEditClick = (user: UserManagement) => {
    setSelectedUser(user);
    
    // Normalize user_type to match select options (case-insensitive match)
    const normalizedUserType = USER_TYPE_OPTIONS.find(
      opt => opt.value.toLowerCase() === (user.user_type || '').toLowerCase()
    )?.value || "Client";
    
    setEditFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      user_type: normalizedUserType as any,
      subscription: (user.subscription as SubscriptionType) || "Trial",
      duration_days: user.duration_days ?? 30,
      user_company: user.user_company || "ZMH Advisors",
      password: "",
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editFormData.first_name?.trim()) {
      errors.first_name = "First name is required";
    }

    if (!editFormData.last_name?.trim()) {
      errors.last_name = "Last name is required";
    }

    if (!editFormData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(editFormData.email)) {
      errors.email = "Email is invalid";
    }

    if (!editFormData.user_type) {
      errors.user_type = "User type is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !validateEditForm()) return;

    try {
      // Send email as username, only include password if provided
      const payload: UpdateUserDTO & { username?: string } = {
        ...editFormData,
        username: editFormData.email,
      };
      
      // Remove password from payload if empty
      if (!payload.password?.trim()) {
        delete payload.password;
      }
      
      await userManagementService.updateUser(selectedUser.id, payload);
      toast.success("User updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      fetchCounts();
      fetchUsers(currentPage, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.username?.[0] ||
        "Failed to update user";
      toast.error(errorMessage);
    }
  };

  // ==================== TOGGLE ACTIVE STATUS ====================

  const handleToggleActive = async (user: UserManagement) => {
    try {
      const payload = {
        is_active: !user.is_active,
      };
      await userManagementService.updateUser(user.id, payload);
      toast.success(
        user.is_active ? "User deactivated successfully" : "User activated successfully"
      );
      fetchCounts();
      fetchUsers(currentPage, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update user status");
    }
  };

  // ==================== MULTI-SELECT HANDLERS ====================

  const handleUserSelect = (user: UserManagement) => {
    const newSelectedIds = new Set(selectedUserIds);
    
    if (newSelectedIds.has(user.id)) {
      newSelectedIds.delete(user.id);
      // If no more users selected, reset selection type
      if (newSelectedIds.size === 0) {
        setSelectionType(null);
      }
    } else {
      newSelectedIds.add(user.id);
      // Set selection type based on first selected user
      if (selectionType === null) {
        setSelectionType(user.is_active ? 'active' : 'inactive');
      }
    }
    
    setSelectedUserIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    // Get users that match current selection type (or all if no type set)
    const eligibleUsers = users.filter(user => {
      if (selectionType === null) return true;
      return selectionType === 'active' ? user.is_active : !user.is_active;
    });
    
    const allEligibleSelected = eligibleUsers.every(user => selectedUserIds.has(user.id));
    
    if (allEligibleSelected) {
      // Deselect all
      setSelectedUserIds(new Set());
      setSelectionType(null);
    } else {
      // Select all eligible users
      const newSelectedIds = new Set<number>();
      let newSelectionType: 'active' | 'inactive' | null = selectionType;
      
      eligibleUsers.forEach(user => {
        if (newSelectionType === null) {
          newSelectionType = user.is_active ? 'active' : 'inactive';
        }
        if ((newSelectionType === 'active' && user.is_active) || 
            (newSelectionType === 'inactive' && !user.is_active)) {
          newSelectedIds.add(user.id);
        }
      });
      
      setSelectedUserIds(newSelectedIds);
      setSelectionType(newSelectionType);
    }
  };

  const isUserDisabled = (user: UserManagement): boolean => {
    if (selectionType === null) return false;
    return selectionType === 'active' ? !user.is_active : user.is_active;
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
    setSelectionType(null);
  };

  const handleBulkStatusChange = async (makeActive: boolean) => {
    if (selectedUserIds.size === 0) return;
    
    try {
      const promises = Array.from(selectedUserIds).map(userId =>
        userManagementService.updateUser(userId, { is_active: makeActive })
      );
      
      await Promise.all(promises);
      toast.success(
        `${selectedUserIds.size} user(s) ${makeActive ? 'activated' : 'deactivated'} successfully`
      );
      
      clearSelection();
      fetchCounts();
      fetchUsers(currentPage, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update users");
    }
  };

  // ==================== SORTING ====================

  const handleSort = (field: 'first_name' | 'last_name' | 'user_company' | 'email') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    if (!sortField) return users;
    
    return [...users].sort((a, b) => {
      const aValue = (a[sortField] || '').toLowerCase();
      const bValue = (b[sortField] || '').toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  const sortedUsers = getSortedUsers();

  const renderSortArrow = (field: 'first_name' | 'last_name' | 'user_company' | 'email') => {
    if (sortField !== field) {
      return <Lucide icon="ChevronUp" className="w-4 h-4 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <Lucide icon="ChevronUp" className="w-4 h-4 ml-1" />
      : <Lucide icon="ChevronDown" className="w-4 h-4 ml-1" />;
  };

  // ==================== DELETE USER ====================

  const handleDeleteClick = (user: UserManagement) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await userManagementService.deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchCounts();
      
      // If last item on page and not first page, go back
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchUsers(currentPage, searchTerm, activeFilter, userTypeFilter, subscriptionFilter);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderPaginationLinks = () => {
    const links = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <Pagination.Link
          key={i}
          active={currentPage === i}
          onClick={() => handlePageChange(i)}
          className="cursor-pointer"
        >
          {i}
        </Pagination.Link>
      );
    }

    return links;
  };

  // ==================== RENDER ====================

  return (
    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12">
        {/* Header with Add Button */}
        <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 md:ml-auto">
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Lucide icon="UserPlus" className="stroke-[1.3] w-4 h-4 mr-2" />
              Add New User
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-4 mt-3.5">
          <div className="flex flex-col p-5 box box--stacked">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div>
                <FormLabel htmlFor="search">Search Users</FormLabel>
                <FormInput
                  id="search"
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <div>
                <FormLabel htmlFor="user-type-filter">Filter by User Type</FormLabel>
                <select
                  id="user-type-filter"
                  value={userTypeFilter}
                  onChange={handleUserTypeFilterChange}
                  className="w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8"
                >
                  <option value="">All User Types</option>
                  {USER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel htmlFor="subscription-filter">Filter by Subscription</FormLabel>
                <select
                  id="subscription-filter"
                  value={subscriptionFilter}
                  onChange={handleSubscriptionFilterChange}
                  className="w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8"
                >
                  <option value="">All Subscriptions</option>
                  {SUBSCRIPTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Cards - Clickable Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div
                className={clsx(
                  "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                  activeFilter === null
                    ? "border-primary border-2 bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => handleFilterClick(null)}
              >
                <div className="text-sm text-slate-500">Total Users</div>
                <div className="mt-1 text-xl font-medium">
                  {countsLoading ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    totalCount
                  )}
                </div>
              </div>
              <div
                className={clsx(
                  "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                  activeFilter === true
                    ? "border-success border-2 bg-success/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => handleFilterClick(true)}
              >
                <div className="text-sm text-slate-500">Active Users</div>
                <div className="mt-1 text-xl font-medium text-success">
                  {countsLoading ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    activeCount
                  )}
                </div>
              </div>
              <div
                className={clsx(
                  "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                  activeFilter === false
                    ? "border-danger border-2 bg-danger/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => handleFilterClick(false)}
              >
                <div className="text-sm text-slate-500">Inactive Users</div>
                <div className="mt-1 text-xl font-medium text-danger">
                  {countsLoading ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    inactiveCount
                  )}
                </div>
              </div>
              <div className="p-4 border rounded-lg border-slate-200">
                <div className="text-sm text-slate-500">Showing</div>
                <div className="mt-1 text-xl font-medium">
                  {listTotal} {activeFilter !== null && (activeFilter ? "Active" : "Inactive")}
                </div>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedUserIds.size > 0 && (
              <div className="flex items-center justify-between p-3 mb-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">
                    {selectedUserIds.size} user(s) selected
                  </span>
                  <span className="text-sm text-slate-500">
                    ({selectionType === 'active' ? 'Active' : 'Inactive'} users)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectionType === 'active' ? (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleBulkStatusChange(false)}
                    >
                      <Lucide icon="UserX" className="w-4 h-4 mr-1" />
                      Deactivate Selected
                    </Button>
                  ) : (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleBulkStatusChange(true)}
                    >
                      <Lucide icon="UserCheck" className="w-4 h-4 mr-1" />
                      Activate Selected
                    </Button>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

            {/* Table */}
            <StandardizedTable isLoading={tableLoading} maxHeight="65vh">
              <StandardizedTable.Header>
                <StandardizedTable.Cell isHeader width="40px">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    checked={users.length > 0 && users.filter(u => !isUserDisabled(u)).every(u => selectedUserIds.has(u.id)) && users.filter(u => !isUserDisabled(u)).length > 0}
                    onChange={handleSelectAll}
                    disabled={tableLoading || users.length === 0}
                  />
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>
                  <div 
                    className="flex items-center cursor-pointer select-none" 
                    onClick={() => handleSort('first_name')}
                  >
                    First Name {renderSortArrow('first_name')}
                  </div>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>
                  <div 
                    className="flex items-center cursor-pointer select-none" 
                    onClick={() => handleSort('last_name')}
                  >
                    Last Name {renderSortArrow('last_name')}
                  </div>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>
                  <div 
                    className="flex items-center cursor-pointer select-none" 
                    onClick={() => handleSort('user_company')}
                  >
                    Company {renderSortArrow('user_company')}
                  </div>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>
                  <div 
                    className="flex items-center cursor-pointer select-none" 
                    onClick={() => handleSort('email')}
                  >
                    Email {renderSortArrow('email')}
                  </div>
                </StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>User Type</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Subscription</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Duration</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Status</StandardizedTable.Cell>
                <StandardizedTable.Cell isHeader>Actions</StandardizedTable.Cell>
              </StandardizedTable.Header>
              <tbody>
                {tableLoading ? (
                  <StandardizedTable.LoadingSkeleton rows={8} cols={10} />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user, index) => {
                    const disabled = isUserDisabled(user);
                    return (
                    <StandardizedTable.Row 
                      key={user.id} 
                      index={index}
                      className={clsx(
                        disabled && "opacity-50 bg-slate-50"
                      )}
                    >
                      <StandardizedTable.Cell>
                        <input
                          type="checkbox"
                          className={clsx(
                            "w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary",
                            disabled ? "cursor-not-allowed" : "cursor-pointer"
                          )}
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleUserSelect(user)}
                          disabled={disabled}
                        />
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.first_name || "-"}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.last_name || "-"}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.user_company || "-"}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <div className="flex items-center gap-2">
                          <Lucide icon="Mail" className="w-4 h-4 text-slate-400" />
                          {user.email}
                        </div>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        <span className="capitalize">
                          {user.user_type || "-"}
                        </span>
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.subscription || "-"}
                      </StandardizedTable.Cell>
                      <StandardizedTable.Cell>
                        {user.duration_days ?? "-"}
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
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                            title="Edit User"
                          >
                            <Lucide icon="Pencil" className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={user.is_active ? "outline-warning" : "outline-success"}
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active ? "Deactivate User" : "Activate User"}
                          >
                            <Lucide icon={user.is_active ? "UserX" : "UserCheck"} className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            title="Delete User"
                          >
                            <Lucide icon="Trash2" className="w-4 h-4" />
                          </Button>
                        </div>
                      </StandardizedTable.Cell>
                    </StandardizedTable.Row>
                  );
                  })
                )}
              </tbody>
            </StandardizedTable>

            {/* Pagination */}
            {!tableLoading && users.length > 0 && totalPages > 1 && (
              <div className="flex flex-col-reverse flex-wrap items-center mt-5 gap-y-2 sm:flex-row">
                <Pagination className="flex-1 w-full mr-auto sm:w-auto">
                  <Pagination.Link
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  >
                    <Lucide icon="ChevronLeft" className="w-4 h-4" />
                  </Pagination.Link>
                  {renderPaginationLinks()}
                  <Pagination.Link
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  >
                    <Lucide icon="ChevronRight" className="w-4 h-4" />
                  </Pagination.Link>
                </Pagination>
                <div className="text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(currentPage * PAGE_SIZE, listTotal)} of {listTotal} users
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
          resetCreateForm();
        }}
      >
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="mr-auto text-base font-medium">Create New User</h2>
            <button
              type="button"
              className="absolute top-0 right-0 mt-3 mr-3 text-slate-400 hover:text-slate-500"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
            >
              <Lucide icon="X" className="w-5 h-5" />
            </button>
          </Dialog.Title>
          <Dialog.Description className="grid grid-cols-12 gap-4 gap-y-3">
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-first_name">
                First Name <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="create-first_name"
                type="text"
                placeholder="Enter first name"
                value={createFormData.first_name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, first_name: e.target.value })
                }
                className={formErrors.first_name ? "border-danger" : ""}
              />
              {formErrors.first_name && (
                <div className="mt-2 text-danger text-xs">{formErrors.first_name}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-last_name">
                Last Name <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="create-last_name"
                type="text"
                placeholder="Enter last name"
                value={createFormData.last_name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, last_name: e.target.value })
                }
                className={formErrors.last_name ? "border-danger" : ""}
              />
              {formErrors.last_name && (
                <div className="mt-2 text-danger text-xs">{formErrors.last_name}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-email">
                Email <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="create-email"
                type="email"
                placeholder="Enter email"
                value={createFormData.email}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, email: e.target.value })
                }
                className={formErrors.email ? "border-danger" : ""}
              />
              {formErrors.email && (
                <div className="mt-2 text-danger text-xs">{formErrors.email}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-password">
                Password <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="create-password"
                type="password"
                placeholder="Enter password (min 8 characters)"
                value={createFormData.password}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, password: e.target.value })
                }
                className={formErrors.password ? "border-danger" : ""}
              />
              {formErrors.password && (
                <div className="mt-2 text-danger text-xs">{formErrors.password}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-user_type">
                User Type <span className="text-danger">*</span>
              </FormLabel>
              <select
                id="create-user_type"
                value={createFormData.user_type}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, user_type: e.target.value as any })
                }
                className={clsx(
                  "w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8",
                  formErrors.user_type ? "border-danger" : ""
                )}
              >
                {USER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.user_type && (
                <div className="mt-2 text-danger text-xs">{formErrors.user_type}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-subscription">
                Subscription
              </FormLabel>
              <select
                id="create-subscription"
                value={createFormData.subscription}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, subscription: e.target.value as SubscriptionType })
                }
                className="w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8"
              >
                {SUBSCRIPTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-duration_days">
                Duration Days
              </FormLabel>
              <FormInput
                id="create-duration_days"
                type="text"
                placeholder="Enter duration days"
                value={createFormData.duration_days}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, duration_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="create-user_company">
                User Company
              </FormLabel>
              <FormInput
                id="create-user_company"
                type="text"
                placeholder="Enter user company"
                value={createFormData.user_company}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, user_company: e.target.value })
                }
              />
            </div>
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
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

      {/* Edit User Modal */}
      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
          setFormErrors({});
        }}
      >
        <Dialog.Panel>
          <Dialog.Title>
            <h2 className="mr-auto text-base font-medium">Edit User</h2>
            <button
              type="button"
              className="absolute top-0 right-0 mt-3 mr-3 text-slate-400 hover:text-slate-500"
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
                setFormErrors({});
              }}
            >
              <Lucide icon="X" className="w-5 h-5" />
            </button>
          </Dialog.Title>
          <Dialog.Description className="grid grid-cols-12 gap-4 gap-y-3">
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-first_name">
                First Name <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="edit-first_name"
                type="text"
                placeholder="Enter first name"
                value={editFormData.first_name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, first_name: e.target.value })
                }
                className={formErrors.first_name ? "border-danger" : ""}
              />
              {formErrors.first_name && (
                <div className="mt-2 text-danger text-xs">{formErrors.first_name}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-last_name">
                Last Name <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="edit-last_name"
                type="text"
                placeholder="Enter last name"
                value={editFormData.last_name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, last_name: e.target.value })
                }
                className={formErrors.last_name ? "border-danger" : ""}
              />
              {formErrors.last_name && (
                <div className="mt-2 text-danger text-xs">{formErrors.last_name}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-email">
                Email <span className="text-danger">*</span>
              </FormLabel>
              <FormInput
                id="edit-email"
                type="email"
                placeholder="Enter email"
                value={editFormData.email || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                className={formErrors.email ? "border-danger" : ""}
              />
              {formErrors.email && (
                <div className="mt-2 text-danger text-xs">{formErrors.email}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-user_type">
                User Type <span className="text-danger">*</span>
              </FormLabel>
              <select
                id="edit-user_type"
                value={editFormData.user_type || "Client"}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, user_type: e.target.value as any })
                }
                className={clsx(
                  "w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8",
                  formErrors.user_type ? "border-danger" : ""
                )}
              >
                {USER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.user_type && (
                <div className="mt-2 text-danger text-xs">{formErrors.user_type}</div>
              )}
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-subscription">
                Subscription
              </FormLabel>
              <select
                id="edit-subscription"
                value={editFormData.subscription || "Trial"}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, subscription: e.target.value as SubscriptionType })
                }
                className="w-full text-sm border-slate-200 shadow-sm rounded-md py-2 px-3 pr-8"
              >
                {SUBSCRIPTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-duration_days">
                Duration Days
              </FormLabel>
              <FormInput
                id="edit-duration_days"
                type="text"
                placeholder="Enter duration days"
                value={editFormData.duration_days ?? 30}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, duration_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="col-span-12 sm:col-span-6">
              <FormLabel htmlFor="edit-user_company">
                User Company
              </FormLabel>
              <FormInput
                id="edit-user_company"
                type="text"
                placeholder="Enter user company"
                value={editFormData.user_company || "ZMH Advisors"}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, user_company: e.target.value })
                }
              />
            </div>
            <div className="col-span-12">
              <FormLabel htmlFor="edit-password">
                Change Password <span className="text-slate-400 text-xs">(leave blank to keep current)</span>
              </FormLabel>
              <FormInput
                id="edit-password"
                type="password"
                placeholder="Enter new password"
                value={editFormData.password || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, password: e.target.value })
                }
              />
            </div>
          </Dialog.Description>
          <Dialog.Footer>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
                setFormErrors({});
              }}
              className="w-20 mr-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleUpdateUser}
              className="w-20"
            >
              Update
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
