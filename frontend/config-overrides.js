const webpack = require('webpack');
const { override } = require('customize-cra');

module.exports = override(
    (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "buffer": require.resolve("buffer/"),
        };
        config.plugins = [
            ...config.plugins,
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
            }),
        ];
        return config;
    }
);