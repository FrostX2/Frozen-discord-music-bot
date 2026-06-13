const fs = require("fs");

module.exports = (client) => {
    client.handleComponents = async () => {
        const componentFolders = fs.readdirSync("./components");
        const { buttons, selectMenus } = client;

        for (const item of componentFolders) {
            const stat = fs.statSync(`./components/${item}`);
            if (stat.isDirectory()) {
                const files = fs.readdirSync(`./components/${item}`).filter(f => f.endsWith(".js"));
                for (const file of files) {
                    const component = require(`../../components/${item}/${file}`);
                    if (item === "buttons") buttons.set(component.data?.name || file, component);
                    else if (item === "selectMenus") selectMenus.set(component.data?.name || file, component);
                }
            }
        }
    };
};
