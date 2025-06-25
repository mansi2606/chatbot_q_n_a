import React from "react";

const Grid = ({ children, style = {}, ...props }: any) => {
  return (
    <div style={{ display: "block", ...style }} {...props}>
      {children}
    </div>
  );
};

export default Grid;