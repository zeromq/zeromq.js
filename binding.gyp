{
  'targets': [
    {
      'target_name': 'zmq',
      'sources': [ 'binding.cc' ],
      'include_dirs' : ["<!(node -e \"require('nan')\")"],
      'cflags!': ['-fno-exceptions'],
      'cflags_cc!': ['-fno-exceptions'],
      'conditions': [
        ['OS=="win"', {
          'msbuild_toolset': 'v120',
          'defines': ['ZMQ_STATIC'],
          'include_dirs': ['windows/include'],
          'conditions': [
            ['target_arch=="ia32"', {
              'libraries': [
                '<(PRODUCT_DIR)/../../windows/lib/x86/libzmq',
                'ws2_32.lib',
              ]
            },{
              'libraries': [
                '<(PRODUCT_DIR)/../../windows/lib/x64/libzmq',
                'ws2_32.lib',
              ]
            }]
          ],
        }],
        ['OS=="mac" or OS=="solaris"', {
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '10.6',
          },
          'libraries': [ '<(PRODUCT_DIR)/../../zmq/lib/libzmq.a' ],
          'include_dirs': [ '<(PRODUCT_DIR)/../../zmq/include' ],
        }],
        ['OS=="openbsd" or OS=="freebsd"', {
        }],
        ['OS=="linux"', {
          'libraries': [ '<(PRODUCT_DIR)/../../zmq/lib/libzmq.a' ],
          'include_dirs': [ '<(PRODUCT_DIR)/../../zmq/include' ],
        }],
      ]
    }
  ]
}
