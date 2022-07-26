import * as mq from 'ibmmq';
import { MQC } from 'ibmmq';
import { StringDecoder } from 'string_decoder';

let qName = 'DEV.QUEUE.1';
let gerenciador_de_filas = '';

const cno = <any>new mq.MQCNO();
const csp = new mq.MQCSP();
csp.UserId = '';
csp.Password = '';
cno.SecurityParms = csp;
cno.Options |= MQC.MQCNO_CLIENT_BINDING;
const cd = new mq.MQCD();
cd.ConnectionName = '';
cd.ChannelName = '';
cno.ClientConn = cd;
// Global variables
let ok = true;
const decoder = new StringDecoder('utf8');

if (MQC.MQCNO_CURRENT_VERSION >= 7) {
  cno.ApplName = 'Node.js 9.1.2 ApplName';
}

function formatErr(err: Error) {
  return `MQ call failed in ${err.message}`;
}

function getMessages(hObj: mq.MQObject) {
  while (ok) {
    getMessage(hObj);
  }
}

function getMessage(hObj: mq.MQObject) {
  const buf = Buffer.alloc(1024);
  let hdr;
  const mqmd = new mq.MQMD();
  const gmo = new mq.MQGMO();

  gmo.Options =
    MQC.MQGMO_NO_SYNCPOINT |
    MQC.MQGMO_NO_WAIT |
    MQC.MQGMO_CONVERT |
    MQC.MQGMO_FAIL_IF_QUIESCING;

  mq.GetSync(hObj, mqmd, gmo, buf, function (err, len) {
    if (err) {
      if (err.mqrc == MQC.MQRC_NO_MSG_AVAILABLE) {
        console.log('no more messages');
      } else {
        console.log(formatErr(err));
      }
      ok = false;
    } else {
      const format = mqmd.Format;
      switch (format) {
        case MQC.MQFMT_RF_HEADER_2:
          hdr = mq.MQRFH2.getHeader(buf);
          const props = mq.MQRFH2.getProperties(hdr, buf);
          console.log('RFH2 HDR is %j', hdr);
          console.log("Properties are '%s'", props);
          printBody(
            hdr.Format,
            buf.slice(hdr.StrucLength),
            len - hdr.StrucLength,
          );
          break;
        case MQC.MQFMT_DEAD_LETTER_HEADER:
          hdr = mq.MQDLH.getHeader(buf);
          console.log('DLH HDR is %j', hdr);
          printBody(
            hdr.Format,
            buf.slice(hdr.StrucLength),
            len - hdr.StrucLength,
          );
          break;
        default:
          printBody(format, buf, len);
          break;
      }
    }
  });
}

function printBody(format: mq.MQFMT, buf: Buffer, len: number) {
  if (format == 'MQSTR') {
    console.log('message len=%d <%s>', len, decoder.write(buf.slice(0, len)));
  } else {
    console.log('binary message: ' + buf.toString());
  }
}

function cleanup(hConn: mq.MQQueueManager, hObj: mq.MQObject) {
  mq.Close(hObj, 0, function (closeErr) {
    if (closeErr) {
      console.log(formatErr(closeErr));
    } else {
      console.log('MQCLOSE successful');
    }
    mq.Disc(hConn, function (discErr) {
      if (discErr) {
        console.log(formatErr(discErr));
      } else {
        console.log('MQDISC successful');
      }
    });
  });
}

const myArgs = process.argv.slice(2); // Remove redundant parms
if (myArgs[0]) {
  qName = myArgs[0];
}
if (myArgs[1]) {
  gerenciador_de_filas = myArgs[1];
}

export function consumer_message() {
  mq.Connx(gerenciador_de_filas, cno, function (connErr, conn) {
    if (connErr) {
      console.log(formatErr(connErr));
    } else {
      console.log('MQCONN to %s successful ', gerenciador_de_filas);
      const od = new mq.MQOD();
      od.ObjectName = qName;
      od.ObjectType = MQC.MQOT_Q;
      const openOptions = MQC.MQOO_INPUT_AS_Q_DEF;

      mq.Open(conn, od, openOptions, function (openErr, hObj) {
        if (openErr) {
          console.log(formatErr(openErr));
        } else {
          console.log('MQOPEN of %s successful', qName);
          getMessages(hObj);
        }
        //cleanup(conn, hObj);
      });
    }
  });
}
