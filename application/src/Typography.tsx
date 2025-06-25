import React from "react";

const Typography = ({ children, style = {}, ...props }: any) => {
  return (
    <div style={{ ...style }} {...props}>
      {children}
    </div>
  );
};

export default Typography;