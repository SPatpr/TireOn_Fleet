
let useUserRole = () => { ["user", "admin", "editor"]}; // TODO: User role from database
const Can = ({role, performance, children}) => {
    let userRole = useUserRole();

    const allowedRoles = Array.isArray(role) ? role : [role];

    if (allowedRoles.includes(userRole)) {
        return children;
    }

    return null;
}
