{
  'variables': {
    'zmq_external%': 'false',
    'openssl_fips': '',
  },
  'targets': [
    {
      'target_name': 'libzmq',
      'type': 'none',
      'actions': [{
        'action_name': 'prepare-build',
        'inputs': [],
        'conditions': [
          ['OS=="win"', {
            'outputs': ['windows/lib/libzmq.lib'],
          }, {
            'outputs': ['zmq/BUILD_SUCCESS'],
          }],
        ],
        'action': ['node', '<(PRODUCT_DIR)/../../scripts/prepare.js'],
      }],
    },
    {
      'target_name': 'zmq',
      'dependencies': ['libzmq'],
      'sources': ['binding.cc'],
      'include_dirs' : ["<!(node -e \"require('nan')\")"],
      'cflags!': ['-fno-exceptions'],
      'cflags_cc!': ['-fno-exceptions'],
      'conditions': [
        ["zmq_external == 'true'", {
          'link_settings': {
            'libraries': ['-lzmq'],
          },
        }, {
          'conditions': [
            ['OS=="win"', {
              'defines': ['ZMQ_STATIC'],
              'include_dirs': ['windows/include'],
              'libraries': [
                '<(PRODUCT_DIR)/../../windows/lib/libzmq',
                'ws2_32.lib',
                'iphlpapi',
              ],
            }],
            ['OS=="mac" or OS=="solaris"', {
              'xcode_settings': {
                'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                'MACOSX_DEPLOYMENT_TARGET': '10.15',
                'CLANG_CXX_LANGUAGE_STANDARD': 'c++17',
              },
              'libraries': ['<(PRODUCT_DIR)/../../zmq/lib/libzmq.a'],
              'include_dirs': ['<(PRODUCT_DIR)/../../zmq/include'],
            }],
            ['OS=="openbsd" or OS=="freebsd"', {
            }],
            ['OS=="linux"', {
              'libraries': ['<(PRODUCT_DIR)/../../zmq/lib/libzmq.a'],
              'include_dirs': ['<(PRODUCT_DIR)/../../zmq/include'],
              'cflags_cc': [ '-std=c++17' ],
            }],
          ],
        }],
      ],
    }
  ]
}
