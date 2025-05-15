// Set visibility of element and all child elements 
export const setTreeVisibility = (d, visible) => {
	d.visible = visible;
	if(d.children?.length > 0) 
		d.children.map((child) => setTreeVisibility(child, visible));
};